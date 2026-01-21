import {Type} from "typebox";


const ErrorSchema = Type.Object({
    message: Type.String(),
});

export {ErrorSchema};
