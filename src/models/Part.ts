import mongoose, { Document, Model, Schema, Types } from 'mongoose';

/**
 * Interface describing the properties for a Story Part document.
 * Each Part represents a major section or arc of the novel.
 */
export interface IPart extends Document {
  title: string;
  order: number;
  systemInstruction: string;
  chapters: Types.ObjectId[];
}

const partSchema: Schema<IPart> = new mongoose.Schema({
  title: { type: String, required: true, trim: true, default: 'New Part' },
  order: { type: Number, required: true },
  systemInstruction: {
    type: String,
    required: true,
    default: 'You are an expert literary editor. Analyze the provided chapter selections from this part of the novel for overall coherence, pacing, and thematic consistency. Use the provided overall story context to inform your analysis.'
  },
  chapters: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }]
}, { timestamps: true });

const Part: Model<IPart> = mongoose.models.Part || mongoose.model<IPart>('Part', partSchema);

export default Part;
