import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {SchemaLibrary} from "@/features/clpp/components/schema-library";


/**
 * Application settings page with schema library.
 *
 * @return The settings page component.
 */
const SettingsPage = () => {
    return (
        <div className={"mx-auto max-w-2xl space-y-6 p-6"}>
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className={"space-y-6"}>
                    <div className={"space-y-2"}>
                        <h3 className={"text-sm font-medium"}>General</h3>
                        <Separator/>
                    </div>
                </CardContent>
            </Card>
            <div className={"space-y-2"}>
                <h3 className={"text-sm font-medium"}>Schema Library</h3>
                <Separator/>
                <SchemaLibrary/>
            </div>
        </div>
    );
};


export default SettingsPage;
