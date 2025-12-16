import request from 'supertest';
import app from '../server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { optionalAuth } from '../middleware/auth.middleware';
import { addResume } from '../utils/localStorage';

// Mock local storage layer (controller uses this, not Firestore)
jest.mock('../utils/localStorage', () => ({
    addResume: jest.fn(() => 'new-resume-id'),
    getResume: jest.fn(),
    getResumeForUser: jest.fn(),
    updateResume: jest.fn(),
    getResumesByUser: jest.fn(() => []),
    deleteResume: jest.fn(),
}));

// Mock auth middleware used by the routes (resume.routes.ts uses optionalAuth)
jest.mock('../middleware/auth.middleware', () => ({
    optionalAuth: jest.fn((req, _res, next) => {
        req.user = { uid: 'test-user-id-456', email: 'authed@example.com' };
        next();
    }),
    authenticateToken: jest.fn((req, _res, next) => {
        req.user = { uid: 'test-user-id-456', email: 'authed@example.com' };
        next();
    }),
}));

// Mock pdf-parse / mammoth
jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({ extractRawText: jest.fn() }));
const mockPdfParse = pdfParse as unknown as jest.Mock;
const mockMammothExtract = (mammoth as any).extractRawText as jest.Mock;

describe('POST /api/resumes/upload', () => {

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Restore default auth behavior for each test (individual tests may override this)
        (optionalAuth as jest.Mock).mockImplementation((req, _res, next) => {
            req.user = { uid: 'test-user-id-456', email: 'authed@example.com' };
            next();
        });

        mockPdfParse.mockResolvedValue({ text: 'Parsed PDF Text Content' });
        mockMammothExtract.mockResolvedValue({ value: 'Parsed DOCX Text Content' });
    });

    // Temporarily add a simple test
    // it('should run a basic test within the suite', () => {
    //     expect(true).toBe(true);
    // });

    // Restore original tests 
    it('should upload, parse, and save a PDF file successfully', async () => {
        // Arrange
        const fileBuffer = Buffer.from('%PDF-1.0 fake content', 'utf-8');

        // Act
        const response = await request(app)
            .post('/api/resumes/upload')
            .attach('resumeFile', fileBuffer, 'test.pdf'); // Use buffer

        // Assert
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            message: 'Resume uploaded and parsed successfully',
            resumeId: 'new-resume-id'
        });
        expect(optionalAuth).toHaveBeenCalledTimes(1); // Verify auth middleware was called
        expect(mockPdfParse).toHaveBeenCalledTimes(1);
        expect(mockMammothExtract).not.toHaveBeenCalled();
        expect(addResume).toHaveBeenCalledTimes(1);
        expect(addResume).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'test-user-id-456',
            originalFilename: 'test.pdf',
            parsedText: 'Parsed PDF Text Content',
            uploadTimestamp: expect.any(String)
        }));
    });

    it('should upload, parse, and save a DOCX file successfully', async () => {
        // Arrange
        const fileBuffer = Buffer.from('Fake DOCX content', 'utf-8');

        // Act
        const response = await request(app)
            .post('/api/resumes/upload')
            .attach('resumeFile', fileBuffer, {
                filename: 'test.docx',
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }); // Need to specify contentType for docx

        // Assert
        expect(response.statusCode).toBe(201);
        expect(response.body.resumeId).toBe('new-resume-id');
        expect(optionalAuth).toHaveBeenCalledTimes(1);
        expect(mockMammothExtract).toHaveBeenCalledTimes(1);
        expect(mockPdfParse).not.toHaveBeenCalled();
        expect(addResume).toHaveBeenCalledTimes(1);
        expect(addResume).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'test-user-id-456',
            originalFilename: 'test.docx',
            parsedText: 'Parsed DOCX Text Content'
        }));
    });

    it('should return 401 if user is not authenticated', async () => {
        // Arrange: Modify the auth mock to simulate failure
        (optionalAuth as jest.Mock).mockImplementation((req, res, next) => {
            res.status(401).json({ message: 'Unauthorized: Mock Failure' });
            // Do not call next()
        });
        const fileBuffer = Buffer.from('%PDF-1.0 fake content', 'utf-8');

        // Act
        const response = await request(app)
            .post('/api/resumes/upload')
            .attach('resumeFile', fileBuffer, 'test.pdf');

        // Assert
        expect(response.statusCode).toBe(401);
        expect(optionalAuth).toHaveBeenCalledTimes(1);
        expect(addResume).not.toHaveBeenCalled();
    });

    it('should return 400 if no file is uploaded', async () => {
        // Act: Send request without attaching a file
        const response = await request(app)
            .post('/api/resumes/upload');
        // .send(); // No file attached

        // Assert
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(/No file uploaded/i);
        expect(optionalAuth).toHaveBeenCalledTimes(1); // Auth runs first
        expect(addResume).not.toHaveBeenCalled();
    });

    it('should return 400 for unsupported file type (e.g., txt)', async () => {
        // Arrange
        const fileBuffer = Buffer.from('Plain text file', 'utf-8');

        // Act
        const response = await request(app)
            .post('/api/resumes/upload')
            .attach('resumeFile', fileBuffer, { filename: 'test.txt', contentType: 'text/plain' });

        // Assert
        // Check if multer filter error is handled or controller handles it
        // Expect 400 based on current controller logic
        expect(response.statusCode).toBe(400);
        // The exact message depends on where the error is caught (multer vs controller)
        // Let's check for common wordings
        expect(response.body.message).toMatch(/(Invalid file type|Unsupported file type)/i);
        expect(optionalAuth).toHaveBeenCalledTimes(1);
        expect(addResume).not.toHaveBeenCalled();
    });

    it('should return 400 if PDF text extraction fails', async () => {
        // Arrange
        mockPdfParse.mockRejectedValue(new Error('Mock PDF Parsing Error'));
        const fileBuffer = Buffer.from('%PDF-1.0 fake content', 'utf-8');

        // Act
        const response = await request(app)
            .post('/api/resumes/upload')
            .attach('resumeFile', fileBuffer, 'test.pdf');

        // Assert
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(/Could not extract text from this PDF/i);
        expect(mockPdfParse).toHaveBeenCalledTimes(1);
        expect(addResume).not.toHaveBeenCalled();
    });

    it('should return 500 if local saving fails', async () => {
        // Arrange
        (addResume as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Mock Local Storage Error');
        });
        const fileBuffer = Buffer.from('%PDF-1.0 fake content', 'utf-8');

        // Act
        const response = await request(app)
            .post('/api/resumes/upload')
            .attach('resumeFile', fileBuffer, 'test.pdf');

        // Assert
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toMatch(/Internal server error during resume processing/i);
        // Parsing should still happen before saving fails
        expect(mockPdfParse).toHaveBeenCalledTimes(1);
        expect(addResume).toHaveBeenCalledTimes(1);
    });

}); 