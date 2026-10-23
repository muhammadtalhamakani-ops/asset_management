import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: 'Unnamed User' },
    role: { type: String, default: 'Site manager' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema, 'login_users');


