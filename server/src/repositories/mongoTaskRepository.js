import mongoose from 'mongoose';
import { PRIORITIES, STATUSES } from '../validators/task.js';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    dueDate: { type: Date, required: true, index: true },
    endsAt: { type: Date, default: null },
    priority: { type: String, enum: PRIORITIES, default: null }, // null = no priority
    status: { type: String, enum: STATUSES, default: 'in_progress', index: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

export const TaskModel = mongoose.models.Task || mongoose.model('Task', taskSchema);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidId = (id) => mongoose.isValidObjectId(id);
const toJSON = (doc) => (doc ? doc.toJSON() : null);

export const mongoTaskRepository = {
  async find({ search, from, to, status } = {}) {
    const filter = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }
    if (from || to) {
      filter.dueDate = {};
      if (from) filter.dueDate.$gte = from;
      if (to) filter.dueDate.$lt = to;
    }
    if (status) filter.status = status;

    const docs = await TaskModel.find(filter).sort({ dueDate: 1, createdAt: 1 });
    return docs.map(toJSON);
  },

  async findForSummary() {
    return TaskModel.find({}, { dueDate: 1, status: 1 }).lean();
  },

  async findById(id) {
    if (!isValidId(id)) return null;
    return toJSON(await TaskModel.findById(id));
  },

  async create(data) {
    return toJSON(await TaskModel.create(data));
  },

  async update(id, data) {
    if (!isValidId(id)) return null;
    const doc = await TaskModel.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    });
    return toJSON(doc);
  },

  async delete(id) {
    if (!isValidId(id)) return null;
    return toJSON(await TaskModel.findByIdAndDelete(id));
  },
};
