module KGN {
    
    export class Observable<T> implements IObservable<T> {

        private readonly _subscribers: Internal.Subscription<T>[] = [];
        private readonly _subscriptions: ISubscription[] = [];
        private readonly _parents: IObservable<any>[] = [];
        private _editCount = 0;
        private _readyDefer: Internal.Defer<T> | null = null;

        constructor(private _value: T) { }

        public get value(): T { return this._value; }
        public set value(value: T) {
            this._editCount++;
            this._value = value;
            for (let sub of this._subscribers)
                sub.action(value);
            if (this._readyDefer !== null) {
                this._readyDefer.resolve(value);
                this._readyDefer = null;
            }
        }

        public get numSubscribers(): number { return this._subscribers.length; }

        public get ready(): Promise<T> {
            return Promise
                .all(this._parents.map((parent, index, arr) => parent.ready))
                .then(_unused => (this._readyDefer === null)
                    ? this.value
                    : this._readyDefer.promise);
        }

        public setPromise(promise: Promise<T>) {
            this._editCount++;
            let cnt = this._editCount;
            promise.then(obj => {
                if (this._editCount !== cnt)
                    return;
                this.value = obj;
            }).catch(error => {
                if (this._editCount === cnt) {
                    if (this._readyDefer !== null) {
                        this._readyDefer.resolve(this.value);
                        this._readyDefer = null;
                    }
                }
            });
            if (this._readyDefer === null)
                this._readyDefer = new Internal.Defer<T>();
        }

        public observe(lambda: (obj: T) => void): ISubscription {
            let sub = new Internal.Subscription<T>(lambda, this);
            this._subscribers.push(sub);
            sub.action(this._value);
            return sub;
        }

        public unsubscribe(sub: Internal.Subscription<T>): void {
            let index = this._subscribers.indexOf(sub);
            if (index >= 0) {
                this._subscribers.splice(index, 1);
            }
        }

        public map<U>(lambda: ((obj: T) => U)): IObservable<U> {
            let result = new Observable(lambda(this.value));
            result._subscriptions.push(this.observe(obj => {
                result.value = lambda(obj);
            }));
            result._parents.push(this);
            return result;
        }

        public mapLazy<U>(lambda: ((obj: T) => Promise<U> | null), initialValue: U): IObservable<U> {
            let result = new LazyObservable<U>(initialValue);
            result._subscriptions.push(this.observe(obj => {
                result.lazySetPromise(() => lambda(obj));
            }));
            result._parents.push(this);
            return result;
        }

        public debounce(timeMs: number): IObservable<T> {
            let result = new Observable(this.value);
            let sub = this.observe(obj => {
                result.setPromise(Observable.timeoutPromise(timeMs).then(() => obj));
            });
            result._subscriptions.push(sub);
            result._parents.push(this);
            return result;
        }

        public dispose() {
            for (let sub of this._subscriptions) {
                sub.dispose();
            }
        }

        private static timeoutPromise(timeMs: number): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                setTimeout(() => resolve(), timeMs);
            });
        }

        public static combine<U>(inputs: {[K in keyof U]: IObservable<U[K]> }): IObservable<U> {
            let initialValues: Partial<U> = {};
            for (let k in inputs) {
                initialValues[k] = inputs[k].value;
            }
            let value = <U>initialValues;

            let result = new Observable<U>(value);
            for (let k in inputs) {
                let sub = inputs[k].observe(obj => {
                    value[k] = obj;
                    result.value = value;
                });
                result._subscriptions.push(sub);
                result._parents.push(inputs[k]);
            }
            return result;
        }

    }
    
    export interface IObservable<T> {
        value: T;
        ready: Promise<T>;
        observe(lambda: (obj: T) => void): ISubscription;
        map<U>(lambda: (obj: T) => U): IObservable<U>;
        mapLazy<U>(lambda: ((obj: T) => Promise<U> | null), initialValue: U): IObservable<U>;
        debounce(timeMs: number): IObservable<T>;
        dispose(): void;
    }


    export interface ISubscription {
        dispose(): void;
    }
}
