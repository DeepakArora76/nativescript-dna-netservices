import {
    ZeroConfServiceBrowser,
    ZeroConfService,
    NetworkMonitorService,
    networkType,
    zeroConfStatus,
} from "nativescript-dna-netservices";

import { EventData,
    Observable
} from "@nativescript/core";

import {
    Subscription,
    timer,
    asyncScheduler,
} from "rxjs";

import {
    tap,
    takeUntil,
    filter,
    distinct,
    concatMap,
    take,
    observeOn
} from "rxjs/operators";

export class HomeViewModel extends Observable {
    public message: string;

    private dnaZeroConfServiceBrowser: ZeroConfServiceBrowser;
    private dnaZeroConfService: ZeroConfService;
    private subscription: Subscription = null;
    private networkStatusSubscription: Subscription = null;
    private registrationSubscription: Subscription = null;
    private allBrowsableDomainsSubscription: Subscription = null;
    private resolveSubscription: Subscription = null;

    constructor() {
        super();
        this.dnaZeroConfServiceBrowser = new ZeroConfServiceBrowser();
        this.dnaZeroConfService = new ZeroConfService();
    }

    public onBrowseServiceTap(args: EventData) {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        const sss = this.dnaZeroConfServiceBrowser.searchForServicesOfTypeInDomain(
            "_http._tcp",
            "local."
        );
        this.subscription = sss.subscribe(
            data => console.log(data),
            error => console.error("The error " + error),
            () => {
                console.log("Completed...");
            }
        );
    }

    public onSearchBrowsableDomainsTap(args: EventData) {
        if (this.allBrowsableDomainsSubscription) {
            this.allBrowsableDomainsSubscription.unsubscribe();
        }

        const allBrowsableDomains = this.dnaZeroConfServiceBrowser.searchForBrowsableDomains();
        this.allBrowsableDomainsSubscription = allBrowsableDomains.subscribe(
            data => console.log(data),
            error => console.error("The error " + error),
            () => {
                console.log("Completed...");
            }
        );
    }

    public onRegisterServiceTap(args: EventData) {
        if (this.registrationSubscription)
            this.registrationSubscription.unsubscribe();

        this.registrationSubscription = this.dnaZeroConfService
            .publish({
                domain: "local.",
                type: "_bridge-the-world._tcp.",
                name: "Bridge The World",
                port: 61234
            })
            .subscribe(data => console.info(data), error => console.error(error));
    }

    public onResolveServiceTap(args: EventData) {
        // if (this.resolveSubscription) {
        //     this.resolveSubscription.unsubscribe();
        // }

        // this.resolveSubscription = this.dnaZeroConfService
        //   .resolve({ domain: "local.", type: "_airplay._tcp.", name: "Apple TV" })
        //   .pipe(tap(data => console.info(data)))
        //   .subscribe(data => console.info(data), error => console.error(error));

        const findService = this.dnaZeroConfServiceBrowser
            .searchForServicesOfTypeInDomain("_bridge-the-world._tcp", "local.")
            .pipe(
                filter(data => data.name && data.name.match(/^Bridge/i).length > 0),
                distinct(),
                concatMap(service =>
                    this.dnaZeroConfService.resolve(service).pipe(
                        tap(data => console.log(data)),
                        filter(service => service.status === zeroConfStatus.success),
                        take(1),
                        observeOn(asyncScheduler)
                    )
                ),
                takeUntil(timer(3000))
            );

        findService.subscribe(
            data => console.info("--------"),
            error => console.error(error),
            () => console.info("Completed...")
        );
    }

    public onSubscribeToNetworkStatusTap(args: EventData) {
        if (this.networkStatusSubscription) return;
        this.networkStatusSubscription = NetworkMonitorService.monitorNetwork()
            .pipe(tap(networkStatus => console.info(networkStatus)))
            .subscribe(ns => {
                let connType = "";
                switch (ns.connType) {
                    case networkType.wifi:
                        connType = "WiFi";
                        break;
                    case networkType.cellular:
                        connType = "Cellular";
                        break;
                    default:
                        connType = "Unavailable";
                }
                this.set("networkStatus", connType + ": " + ns.ipAddress);
            });
    }

    public onWifiIpAddressTap(args: EventData) {
        NetworkMonitorService.dumpIpAddress().subscribe(
            data => console.log(data),
            error => console.log(error),
            () => console.log("Completed...")
        );

        NetworkMonitorService.getCellularIpAddress()
            .pipe(tap(ip => console.info(ip)))
            .subscribe(ipAddr => {
                this.set("message", ipAddr);
            });

        NetworkMonitorService.getWiFiIpAddress()
            .pipe(tap(ip => console.info(ip)))
            .subscribe(ipAddr => {
                this.set("message", ipAddr);
            });
    }
}

