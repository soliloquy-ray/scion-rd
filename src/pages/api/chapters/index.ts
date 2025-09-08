import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Chapter, { IChapter } from '../../../models/Chapter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const chapters: IChapter[] = await Chapter.find({}).sort({ order: 'asc' });
        res.status(200).json({ success: true, data: chapters });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;
    case 'POST':
      try {
        const chapter: IChapter = await Chapter.create(req.body);
        res.status(201).json({ success: true, data: chapter });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
}
