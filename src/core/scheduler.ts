export interface Deadline { readonly at: number; readonly id: number }

/** Minimum deadline first, then original registration ID for equal deadlines.
 * IDs are unique monotonic registration numbers; queued keys must not be mutated.
 * The queue owns storage only: clock advancement and generation checks stay in the game.
 */
export class DeadlineQueue<T extends Deadline> {
  private items: T[] = [];

  peek(): T | undefined { return this.items[0]; }

  push(item: T): void {
    let index = this.items.length;
    this.items.push(item);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.before(item, this.items[parent])) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop(): T | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last !== undefined) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return first;
  }

  /** Retain matching jobs without changing their registration IDs or deadlines.
   * The predicate is independent of traversal order; heap rebuilding is linear.
   */
  retain(keep: (item: T) => boolean): void {
    this.items = this.items.filter(keep);
    for (let index = Math.floor(this.items.length / 2) - 1; index >= 0; index--) this.siftDown(index);
  }

  private before(a: T, b: T): boolean { return (a.at - b.at || a.id - b.id) < 0; }

  private siftDown(start: number): void {
    const item = this.items[start];
    let index = start;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.items.length && this.before(this.items[child + 1], this.items[child])) child++;
      if (!this.before(this.items[child], item)) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = item;
  }
}
