import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Chapter, { IChapter } from '../../../models/Chapter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query: { id }, method } = req;

  // Ensure id is a string
  const chapterId = Array.isArray(id) ? id[0] : id;

  if (!chapterId) {
    return res.status(400).json({ success: false, error: "ID is missing" });
  }

  await dbConnect();

  switch (method) {
    case 'PUT':
      try {
        const chapter: IChapter | null = await Chapter.findByIdAndUpdate(chapterId, req.body, {
          new: true,
          runValidators: true,
        });
        if (!chapter) {
          return res.status(404).json({ success: false, error: "Chapter not found" });
        }
        res.status(200).json({ success: true, data: chapter });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;
    
    case 'DELETE':
      try {
        const deletedChapter = await Chapter.deleteOne({ _id: chapterId });
        if (deletedChapter.deletedCount === 0) {
          return res.status(404).json({ success: false, error: "Chapter not found" });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
}
