export class Monitor {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly targetId: string,
    public readonly isActive: boolean = true,
    public readonly name: string | null = null,
    public readonly createdAt: Date = new Date(),
  ) {}
}
