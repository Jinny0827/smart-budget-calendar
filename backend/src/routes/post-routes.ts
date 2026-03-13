import { Router } from 'express';
import { authenticationToken } from '../middleware/auth';
import {createPost, deletePost, getPost, getPosts, updatePost} from "../controllers/post-controller";


const router = Router();

router.get('/:boardType',     authenticationToken, getPosts);   // 목록
router.get('/detail/:id',     authenticationToken, getPost);    // 상세
router.post('/:boardType',    authenticationToken, createPost); // 작성
router.put('/:id',            authenticationToken, updatePost); // 수정
router.delete('/:id',         authenticationToken, deletePost); // 삭제

export default router;
