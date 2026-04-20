import { Router, Request, Response, NextFunction } from 'express';
import { ProductRepository } from '../repositories/products';
import { ReportRepository } from '../repositories/reports';
import { AnnouncementRepository } from '../repositories/announcements';
import { UserRepository } from '../repositories/users';
import { MessageRepository } from '../repositories/messages';
import { insertAnnouncementSchema } from '../db/schema';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { db } from '../db';
import { users, reports } from '../db/schema';
import { sql, eq } from 'drizzle-orm';
import Database from 'better-sqlite3';

const router = Router();
const productRepo = new ProductRepository();
const reportRepo = new ReportRepository();
const announcementRepo = new AnnouncementRepository();
const userRepo = new UserRepository();
const messageRepo = new MessageRepository();

// Middleware: require admin role
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;
  if (!user || (user as any).role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

// GET /api/admin/stats - dashboard stats
router.get('/stats', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [todayProducts, pendingProducts, pendingReports, statusCounts] = await Promise.all([
      productRepo.countTodayNew(),
      productRepo.findAll({ status: 'pending', limit: 1 }),
      reportRepo.countPending(),
      productRepo.countByStatus(),
    ]);

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const [todayUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.createdAt} >= ${oneDayAgo}`);

    res.json({
      success: true,
      data: {
        todayNewUsers: todayUsersResult?.count ?? 0,
        todayNewProducts: todayProducts,
        pendingProducts: pendingProducts.length,
        pendingReports,
        statusCounts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/products - get all products for review
router.get('/products', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const products = await productRepo.findAll({ status: (status as string) || 'pending' });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/products/:id/review - approve or reject product
router.put('/products/:id/review', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, rejectReason } = req.body;
    if (!['approve', 'reject'].includes(action)) throw new AppError('Invalid action', 400);
    const status = action === 'approve' ? 'approved' : 'rejected';
    const product = await productRepo.update(req.params.id as string, { status, rejectReason: rejectReason || null });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reports - get all reports
router.get('/reports', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const reports = await reportRepo.findAll(status as string);
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/reports/:id - resolve report
router.put('/reports/:id', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Processing report resolution:', req.params.id, req.body);
    const { status, adminNote } = req.body;
    
    // Get the report first
    const report = await db
      .select()
      .from(reports)
      .where(eq(reports.id, req.params.id as string))
      .get();
    
    if (!report) {
      console.log('Report not found:', req.params.id);
      throw new AppError('Report not found', 404);
    }
    
    console.log('Found report:', report);
    
    // Update the report
    const updatedReport = await reportRepo.update(req.params.id as string, { status, adminNote });
    console.log('Report updated:', updatedReport);
    
    // Get the reporter's information
    const [reporter] = await db
      .select()
      .from(users)
      .where(eq(users.id, report.reporterId));
    console.log('Reporter found:', reporter);
    
    // Send message to reporter if report is resolved or dismissed
    if (reporter && (status === 'resolved' || status === 'dismissed')) {
      console.log('Sending message to reporter');
      const adminId = (req as AuthRequest).user!.id;
      const messageContent = status === 'resolved' 
        ? `您的举报已处理，我们已对相关内容进行了相应处理。感谢您对平台的监督！`
        : `您的举报已驳回，经审核，该内容未违反平台规则。如有其他问题，请联系客服。`;
      
      console.log('Message content:', messageContent);
      console.log('Admin ID:', adminId);
      console.log('Reporter ID:', reporter.id);
      
      try {
        const message = await messageRepo.create({
          senderId: adminId,
          receiverId: reporter.id,
          content: messageContent
        });
        console.log('Message sent successfully:', message);
      } catch (messageError) {
        console.error('Error sending message:', messageError);
        // Continue with report resolution even if message sending fails
      }
    }
    
    res.json({ success: true, data: updatedReport });
  } catch (error) {
    console.error('Error processing report:', error);
    next(error);
  }
});

// GET /api/admin/users - get all users except banned ones
router.get('/users', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Getting users...');
    // Use UserRepository to get all users
    const allUsers = await userRepo.findAll();
    console.log('All users:', allUsers);
    
    // Convert snake_case fields to camelCase and ensure boolean fields are properly formatted
    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      studentId: user.studentId,
      role: user.role,
      isVerified: !!user.isVerified,
      verificationStatus: user.verificationStatus,
      creditScore: user.creditScore,
      isBanned: !!user.isBanned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    next(error);
  }
});

// PUT /api/admin/users/:id/ban - ban/unban user
router.put('/users/:id/ban', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isBanned } = req.body;
    console.log('Ban user request:', { isBanned, type: typeof isBanned });
    // Convert boolean to number for SQLite
    const isBannedNum = isBanned ? 1 : 0;
    console.log('Converted isBanned to number:', { value: isBannedNum, type: typeof isBannedNum });
    const userId = req.params.id as string;
    
    // Use UserRepository to update user status
    const updatedUser = await userRepo.update(userId, { isBanned: isBannedNum as any });
    console.log('Update result:', updatedUser);
    
    // Return success
    res.json({ success: true, data: { id: userId, isBanned: updatedUser.isBanned } });
  } catch (error) {
    console.error('Ban user error:', error);
    next(error);
  }
});

// GET /api/admin/announcements - get all announcements
router.get('/announcements', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await announcementRepo.findAll();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/announcements - create announcement
router.post('/announcements', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = (req as AuthRequest).user!.id;
    const validated = insertAnnouncementSchema.parse({ ...req.body, authorId });
    const announcement = await announcementRepo.create(validated);
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/announcements/:id - update announcement
router.put('/announcements/:id', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const announcement = await announcementRepo.update(req.params.id as string, req.body);
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/announcements/:id - delete announcement
router.delete('/announcements/:id', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await announcementRepo.delete(req.params.id as string);
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    next(error);
  }
});

export default router;
