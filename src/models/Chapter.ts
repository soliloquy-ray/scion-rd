import mongoose, { Document, Model, Schema } from 'mongoose';

// Interface describing the properties a Chapter document has
export interface IChapter extends Document {
  title: string;
  content: string;
  order: number;
  critique?: string; // Optional field to store AI critique
  summary?: string;  // Optional field to store AI summary
}

const chapterSchema: Schema<IChapter> = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Chapter title is required.'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Chapter content is required.'],
  },
  order: {
    type: Number,
    required: [true, 'Chapter order is required.'],
  },
  critique: {
    type: String,
    required: false,
  },
  summary: {
    type: String,
    required: false,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// To prevent model recompilation error in Next.js hot-reloading environment
const Chapter: Model<IChapter> = mongoose.models.Chapter || mongoose.model<IChapter>('Chapter', chapterSchema);

export default Chapter;

