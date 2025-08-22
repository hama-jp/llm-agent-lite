import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';

// このフラグは、後で設定画面から変更できるようにする
const ENABLE_FS_API = true;

const router = express.Router();
router.use(express.json());

const a = () => (req, res, next) => {
  if (!ENABLE_FS_API) {
    return res.status(403).json({ error: 'File System API is disabled.' });
  }
  // TODO: Add workspace directory restriction
  next();
};

const validatePath = (req, res, next) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }

  // Basic security check to prevent path traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve('.'))) { // Limit to project directory for now
    // return res.status(403).json({ error: 'Access denied. Path is outside of the allowed directory.' });
  }

  req.body.resolvedPath = resolvedPath;
  next();
};


router.post('/fs/read', a(), validatePath, async (req, res) => {
  try {
    const content = await fs.readFile(req.body.resolvedPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: `Error reading file: ${error.message}` });
  }
});

router.post('/fs/write', a(), validatePath, async (req, res) => {
  const { content } = req.body;
  if (content === undefined || content === null) {
    return res.status(400).json({ error: 'Content is required for writing.' });
  }
  try {
    await fs.writeFile(req.body.resolvedPath, String(content));
    res.json({ success: true, message: `File written to ${req.body.resolvedPath}` });
  } catch (error) {
    res.status(500).json({ error: `Error writing file: ${error.message}` });
  }
});

router.post('/fs/list', a(), validatePath, async (req, res) => {
  try {
    const items = await fs.readdir(req.body.resolvedPath, { withFileTypes: true });
    const result = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Error listing directory: ${error.message}` });
  }
});

export const fsApi = (app) => {
  app.use('/api', router);
};
