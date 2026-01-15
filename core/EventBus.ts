
export type EventCallback<T = any> = (data: T) => void;

export class EventBus {
  private events: Map<string, EventCallback[]>;

  constructor() {
    this.events = new Map();
  }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(callback);

    // Return unsubscriber
    return () => this.off(event, callback);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    const subscribers = this.events.get(event);
    if (subscribers) {
      this.events.set(
        event,
        subscribers.filter((cb) => cb !== callback)
      );
    }
  }

  emit<T>(event: string, data?: T): void {
    const subscribers = this.events.get(event);
    if (subscribers) {
      subscribers.forEach((cb) => cb(data));
    }
  }

  destroy() {
    this.events.clear();
  }
}
