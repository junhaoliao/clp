import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Separator} from "@/components/ui/separator";
import {Switch} from "@/components/ui/switch";
import {SchemaLibrary} from "@/features/clpp/components/schema-library";
import {useClppSettingsStore} from "@/features/clpp/stores/clpp-settings-store";


/**
 * Application settings page with schema library.
 *
 * @return The settings page component.
 */
const SettingsPage = () => {
    const experimentalMode = useClppSettingsStore((s) => s.experimentalMode);
    const setExperimentalMode = useClppSettingsStore((s) => s.setExperimentalMode);

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
                        <div className={"flex items-center justify-between"}>
                            <div className={"space-y-0.5"}>
                                <Label htmlFor={"experimental-mode"}>
                                    Experimental Mode
                                </Label>
                                <p className={"text-sm text-muted-foreground"}>
                                    Enable CLPP features (field browser, query
                                    bar, patterns, schema, stats)
                                </p>
                            </div>
                            <Switch
                                checked={experimentalMode}
                                id={"experimental-mode"}
                                onCheckedChange={setExperimentalMode}/>
                        </div>
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
