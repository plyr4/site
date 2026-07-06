import type { Topping } from "./topping";
import { Cheese } from "./cheese";
import { Pepperoni } from "./pepperoni";
import { Mushroom } from "./mushroom";
import { BellPepper } from "./bell_pepper";
import { BananaPepper } from "./banana_pepper";
import { BlackOlive } from "./black_olive";
import { Sausage } from "./sausage";
import { Ham } from "./ham";
import { Pineapple } from "./pineapple";
import { Onion } from "./onion";

export const cheese: () => Topping = () => {
    return new Cheese();
}

export const otherToppings: () => Topping[] = () => {
    return [
        new Pepperoni(),
        new Mushroom(),
        new BellPepper(),
        new BananaPepper(),
        new BlackOlive(),
        new Sausage(),
        new Ham(),
        new Pineapple(),
        new Onion(),
    ];
}
