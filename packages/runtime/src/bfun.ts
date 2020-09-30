export interface IBfun {
    use: () => void;
}

class Bfun implements IBfun {
    use() {
    }
}

export default Bfun;
