"use client";

import * as React from "react";

import {XIcon} from "lucide-react";
import {Dialog as DialogPrimitive} from "radix-ui";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";


/**
 *
 * @param root0
 */
const Dialog = ({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) => {
    return (
        <DialogPrimitive.Root
            data-slot={"dialog"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 */
const DialogTrigger = ({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) => {
    return (
        <DialogPrimitive.Trigger
            data-slot={"dialog-trigger"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 */
const DialogPortal = ({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) => {
    return (
        <DialogPrimitive.Portal
            data-slot={"dialog-portal"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 */
const DialogClose = ({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) => {
    return (
        <DialogPrimitive.Close
            data-slot={"dialog-close"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const DialogOverlay = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => {
    return (
        <DialogPrimitive.Overlay
            data-slot={"dialog-overlay"}
            className={cn(
                "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
                className
            )}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.children
 * @param root0.showCloseButton
 */
const DialogContent = ({
    className,
    children,
    showCloseButton = true,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
}) => {
    return (
        <DialogPortal data-slot={"dialog-portal"}>
            <DialogOverlay/>
            <DialogPrimitive.Content
                data-slot={"dialog-content"}
                className={cn(
                    "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        className={"absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"}
                        data-slot={"dialog-close"}
                    >
                        <XIcon/>
                        <span className={"sr-only"}>Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const DialogHeader = ({className, ...props}: React.ComponentProps<"div">) => {
    return (
        <div
            className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
            data-slot={"dialog-header"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.showCloseButton
 * @param root0.children
 */
const DialogFooter = ({
    className,
    showCloseButton = false,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    showCloseButton?: boolean;
}) => {
    return (
        <div
            data-slot={"dialog-footer"}
            className={cn(
                "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className
            )}
            {...props}
        >
            {children}
            {showCloseButton && (
                <DialogPrimitive.Close asChild={true}>
                    <Button variant={"outline"}>Close</Button>
                </DialogPrimitive.Close>
            )}
        </div>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const DialogTitle = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => {
    return (
        <DialogPrimitive.Title
            className={cn("text-lg leading-none font-semibold", className)}
            data-slot={"dialog-title"}
            {...props}/>
    );
};

/**
 *
 * @param root0
 * @param root0.className
 */
const DialogDescription = ({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => {
    return (
        <DialogPrimitive.Description
            className={cn("text-sm text-muted-foreground", className)}
            data-slot={"dialog-description"}
            {...props}/>
    );
};

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
