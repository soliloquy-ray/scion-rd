import dbConnect from '@/lib/dbConnect';
import Story from '@/models/Story';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        // We find the single story document. If it doesn't exist yet, we create it.
        let story = await Story.findOne({});
        if (!story) {
          story = await Story.create({}); // Creates with the default summary
        }
        res.status(200).json({ success: true, data: story });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;

    case 'PUT':
      try {
        const { plotSummary } = req.body;
        // Find and update the single story document. `upsert: true` creates it if it doesn't exist.
        const story = await Story.findOneAndUpdate({}, { plotSummary }, {
          new: true, // Return the updated document
          upsert: true, // Create if it doesn't exist
          runValidators: true,
        });
        res.status(200).json({ success: true, data: story });
      } catch (error) {
        res.status(400).json({ success: false, error: (error as Error).message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
}
