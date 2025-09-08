import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Part from '../../../models/Part';
import { IPart } from '../../../models/Part';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const parts: IPart[] = await Part.find({}).sort({ order: 'asc' }).populate('chapters');
        res.status(200).json({ success: true, data: parts });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;

    case 'POST':
      try {
        const count = await Part.countDocuments();
        const part = await Part.create({ ...req.body, order: count });
        res.status(201).json({ success: true, data: part });
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
