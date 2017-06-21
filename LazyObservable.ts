module KGN {
    export class LazyObservable<T> extends KGN.Observable<T> {
        private _lastPromiseLambda: (() => Promise<T> | null) | null = null;

        public lazySetPromise(lambda: (() => Promise<T> | null)) {
            if (this.numSubscribers > 0) {
                let promise = lambda();
                if (promise !== null)
                    this.setPromise(promise);
            }
            else {
                this._lastPromiseLambda = lambda;
            }
        }

        public setPromise(p: Promise<T>) {
            this._lastPromiseLambda = null;
            super.setPromise(p);
        }
        public set value(val: T) {
            this._lastPromiseLambda = null;
            super.value = val;
        }
        public observe(lambda: (obj: T) => void): ISubscription {
            if (this._lastPromiseLambda !== null) {
                let promise = this._lastPromiseLambda();
                if (promise !== null)
                    this.setPromise(promise);
            }
            return super.observe(lambda);
        }
    }
}