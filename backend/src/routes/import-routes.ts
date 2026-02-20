import express from 'express';
import multer from 'multer';
import { importCardHistory } from '../controllers/import-controller';
import { authenticationToken } from '../middleware/auth';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel',                                           // xls
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('xlsx 또는 xls 파일만 업로드 가능합니다'));
        }
    },
});

router.use(authenticationToken);

// POST /api/import/card - 카드사 엑셀 내역 가져오기
router.post('/card', upload.single('file'), importCardHistory);

export default router;
