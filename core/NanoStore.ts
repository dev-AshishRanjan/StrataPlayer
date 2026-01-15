
export type Listener<T> = (state: T, prevState: T) => void;

export class NanoStore<T> {
  private state: T;
  private listeners: Set<Listener<T>>;

  constructor(initialState: T) {
    this.state = initialState;
    this.listeners = new Set();
  }

  get(): T {
    return this.state;
  }

  setState(partial: Partial<T> | ((prev: T) => Partial<T>)) {
    const prevState = this.state;
    const update = typeof partial === 'function' ? (partial as any)(prevState) : partial;
    this.state = { ...prevState, ...update };
    
    this.listeners.forEach((listener) => listener(this.state, prevState));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    this.listeners.clear();
  }
}
