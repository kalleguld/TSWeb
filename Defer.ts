module KGN.Internal {
    export class Defer<T> {

        constructor() {
            this.promise = new Promise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });
        }

        public readonly promise: Promise<T>;

        private _resolve: (value?: T | Promise<T>) => void;
        public resolve(value?: T | Promise<T>) {
            this._resolve(value);
        }

        private _reject: (err?: any) => void;
        public reject(err: any) {
            this._reject(err);
        }
    }
}
