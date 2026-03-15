// Storage not used — we proxy to the existing MySQL backend
export interface IStorage {}
export class MemStorage implements IStorage {}
export const storage = new MemStorage();
