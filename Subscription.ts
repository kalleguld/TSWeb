module KGN.Internal {

    export class Subscription<T> implements ISubscription {
        constructor(
            private lambda: ((obj: T) => void),
            private parent: Observable<T>
        ) {
            let p: Promise<number> | null = null;
        }
        public action(obj: T) {
            if (this.lambda !== null) {
                this.lambda(obj);
            }
        }

        public dispose() {
            if (this.parent !== null) {
                this.parent.unsubscribe(this);
            }
        }
    }


}