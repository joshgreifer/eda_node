export type Partition<T> = {
    [Key in string | number]: Array<T>;
};
export type FilterFunc<T> = (item: T, index: number, array: Array<T>) => boolean
export type PartitionFunc<T> = (item: T, index: number, array: Array<T>) => string | number

export function AddAlgorithms(obj: Object = Array.prototype) {

    if (! ('length' in obj))
        throw `Can't add algorithms to an object without 'length' property`;

    if (typeof obj[Symbol.iterator] === 'undefined')
        throw `Can't add algorithms to a non-iterable object `;

    Object.defineProperty(obj, 'randomElement', {
        value: function () {
            return this.length ? this[Math.floor(Math.random() * this.length)] : undefined;
        }
    });


    Object.defineProperty(obj, 'crypt', {
        value:
            function (k: ArrayLike<number>) {
                const nk = k.length;

                for (let i = 0; i < this.length; ++i)
                    this[i] ^=  k[i % nk];
                return this;
            }
    })


    Object.defineProperty(obj, 'shuffle', {
        value: function () {
            // Knuth shuffle https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
            for (let i = this.length; i > 0;) {
                const j = Math.floor(Math.random() * i);
                --i;
                const tmp = this[i];
                this[i] = this[j];
                this[j] = tmp;
            }
            return this;
        }
    });

    Object.defineProperty(obj, 'partition', {
        value:
            function <T>(filter: PartitionFunc<T>) {
                const partitions: Partition<T> = {};
                let index = 0;
                for (const item of this) {
                    const k = filter(item, index++, this);
                    if (partitions[k] === undefined)
                        partitions[k] = [];
                    partitions[k].push(item);
                }
                return partitions;
            }
    })
}