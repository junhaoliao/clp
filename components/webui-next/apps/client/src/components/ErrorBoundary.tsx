import {
    Component,
    type ReactNode,
} from "react";

import {Button} from "./ui/button";


interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}


/**
 * React Error Boundary that catches render errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor (props: ErrorBoundaryProps) {
        super(props);
        this.state = {error: null};
    }

    static getDerivedStateFromError (error: Error): ErrorBoundaryState {
        return {error};
    }

    // eslint-disable-next-line class-methods-use-this
    componentDidCatch (error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({error: null});
    };

    render () {
        if (null !== this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={"flex flex-col items-center justify-center gap-4 p-8"}>
                    <h2 className={"text-lg font-semibold text-destructive"}>
                        {"Something went wrong"}
                    </h2>
                    <p className={"text-sm text-muted-foreground"}>
                        {this.state.error.message}
                    </p>
                    <Button
                        type={"button"}
                        onClick={this.handleRetry}
                    >
                        {"Try Again"}
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}


export {ErrorBoundary};
