class Lookup {
    constructor(name, dict) {
        this.name = name;
        this.dict = dict;
    }
    add(key, value) {
        if (key in dict) {
            Debug.error(this.name, "KeyAlreadySet", key);
        }
        else {
            dict[key] = value;
        }
    }
    isValue(key) {
        if (key in this.dict) {
            return true;
        }
        else {
            return false;
        }
    }
    getValue(key) {
        if (key in this.dict) {
            return this.dict[key];
        }
        else {
            Debug.error(this.name, "KeyNotFound", key);
        }
    }
    getKey(value) {
        for (let k in this.dict) {
            if (this.dict[k] == value) {
                return k;
            }
        }
        Debug.error(this.name, "ValueNotFound", value);
    }
}
