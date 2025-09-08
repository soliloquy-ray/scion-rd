import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Interface describing the properties for the single Story Context document.
 * This document holds the master plot summary for the entire novel.
 */
export interface IStory extends Document {
  plotSummary: string;
}

const storySchema: Schema<IStory> = new mongoose.Schema({
  plotSummary: {
    type: String,
    required: true,
    // A helpful default for when the user first starts.
    default: 'No overall plot summary has been set yet. This is where you can keep track of major plot points, character arcs, and thematic elements for the AI to reference.',
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// To prevent model recompilation error in Next.js hot-reloading environment
const Story: Model<IStory> = mongoose.models.Story || mongoose.model<IStory>('Story', storySchema);

export default Story;
