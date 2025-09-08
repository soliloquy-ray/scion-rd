import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface to define the properties of a Chapter document
export interface IChapter extends Document {
  title: string;
  content: string;
  order: number;
}

const ChapterSchema: Schema<IChapter> = new Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for this chapter.'],
    maxlength: [60, 'Title cannot be more than 60 characters'],
  },
  content: {
    type: String,
    required: [true, 'Please provide content for this chapter.'],
  },
  order: {
    type: Number,
    required: [true, 'Please provide an order for this chapter.'],
  },
});

// To prevent model overwrite errors in Next.js, we check if the model already exists.
const Chapter: Model<IChapter> = mongoose.models.Chapter || mongoose.model<IChapter>('Chapter', ChapterSchema);

export default Chapter;
