import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Part from '../../../models/Part';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query: { id }, method } = req;
  await dbConnect();

  switch (method) {
    case 'PUT':
      try {
        const part = await Part.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!part) return res.status(404).json({ success: false, error: 'Part not found' });
        res.status(200).json({ success: true, data: part });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;

    case 'DELETE':
      try {
        const deletedPart = await Part.deleteOne({ _id: id });
        if (!deletedPart.deletedCount) return res.status(404).json({ success: false, error: 'Part not found' });
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
