import { Router } from 'express';
import { extractInfo } from '../services/extractor';
import { detectPlatform, isValidHttpUrl } from '../utils/platform';
import { AppError } from '../utils/errors';
import { wrap } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/parse',
  wrap(async (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) throw new AppError('INVALID_URL', '请输入视频或图片链接', 400);

    const platform = detectPlatform(url);
    if (!platform) {
      if (isValidHttpUrl(url)) throw new AppError('UNSUPPORTED', '当前平台不支持', 400);
      throw new AppError('INVALID_URL', 'URL 格式错误，请输入有效的视频或图片链接', 400);
    }

    const info = await extractInfo(url);
    res.json({ platform: { key: platform.key, name: platform.name }, info });
  }),
);

export default router;
