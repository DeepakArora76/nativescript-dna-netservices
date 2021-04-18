import { Observable, Observer, of } from 'rxjs';
import { finalize, mergeMap } from 'rxjs/operators';
import * as Connectivity from '@nativescript/core/connectivity';

import { addressType, IAddress, NetworkStatus, networkType } from './netservice.common';

export class NetworkMonitorService {
  public static monitorNetwork(): Observable<NetworkStatus> {
    const netMon: Observable<Observable<NetworkStatus>> = new Observable(
      observer => {
        observer.next(NetworkMonitorService.getNetworkStatus());

        Connectivity.startMonitoring((newConnectionType: number) => {
          observer.next(
            NetworkMonitorService.getNetworkStatusFromType(newConnectionType)
          );
        });

        return () => {
          Connectivity.stopMonitoring();
        };
      }
    );
    return netMon.pipe(
      mergeMap(value => value),
      finalize(() => Connectivity.stopMonitoring())
    );
  }

  public static getWiFiIpAddress(): Observable<string> {
    const at = addressType.IPv4;
    const addresses = NetworkMonitorService.getInterfaceCardIpAddress(
      "en0",
      at
    );
    return of(addresses.length ? addresses[0].address : "");
  }

  public static getCellularIpAddress(): Observable<string> {
    const at = addressType.IPv4;
    let addrs = NetworkMonitorService.getInterfaceCardIpAddress("pdp_ip0", at);
    if (!addrs.length)
      addrs = NetworkMonitorService.getInterfaceCardIpAddress("pdp_ip1", at);
    else if (!addrs.length)
      addrs = NetworkMonitorService.getInterfaceCardIpAddress("pdp_ip2", at);
    else if (!addrs.length)
      addrs = NetworkMonitorService.getInterfaceCardIpAddress("pdp_ip3", at);
    return of(addrs.length ? addrs[0].address : "");
  }

  public static getNetworkStatus(): Observable<NetworkStatus> {
    return NetworkMonitorService.getNetworkStatusFromType(
      Connectivity.getConnectionType()
    );
  }

  public static dumpIpAddress(): Observable<IAddress[]> {
    const ipAddrObserable: Observable<IAddress[]> = new Observable(
      (observer: Observer<IAddress[]>) => {
        let addresses = NetworkMonitorService.getInterfaceCardIpAddress();
        observer.next(addresses);
        observer.complete();
      }
    );

    return ipAddrObserable;
  }

  private static getNetworkStatusFromType(
    cType: number
  ): Observable<NetworkStatus> {
    switch (cType) {
      case Connectivity.connectionType.wifi:
        return NetworkMonitorService.getWiFiIpAddress().pipe(
          mergeMap(ipAddr =>
            of({
              connType: networkType.wifi,
              ipAddress: ipAddr
            })
          )
        );

      case Connectivity.connectionType.mobile:
        return NetworkMonitorService.getCellularIpAddress().pipe(
          mergeMap(ipAddr =>
            of({
              connType: networkType.cellular,
              ipAddress: ipAddr
            })
          )
        );

      default:
        return of({ connType: networkType.none, ipAddress: "" });
    }
  }

  private static getInterfaceCardIpAddress(
    interfaceCardName?: string,
    ipAddressType?: addressType
  ): IAddress[] {
    const MAX_ADDRLEN = 46; // set to INET6
    let addresses: IAddress[] = [];

    let iPtrPtr = new interop.Reference<interop.Reference<ifaddrs>>();
    if (getifaddrs(iPtrPtr) === 0) {
      const interfacesPtr = iPtrPtr.value;
      let tempAddrPtr = interfacesPtr;
      while (tempAddrPtr != null) {
        let sinAddr = null;
        const addr = tempAddrPtr.value;
        const adapterName = NSString.stringWithUTF8String(addr.ifa_name).toString();
        const sa = new interop.Reference(sockaddr, addr.ifa_addr).value;
        const sinFamily = sa.sa_family;
        if (sinFamily === 2 /*AF_INET*/) {
          // "add(4)" is a workaround to the below commented out code
          sinAddr = interop.handleof(addr.ifa_addr).add(4);

          //// Below code is commented out as interop.Reference returns undefined value
          // const addrIn = new interop.Reference(sockaddr_in, addr.ifa_addr).value;
          // sinAddr = addrIn.sin_addr;
        } else if (sinFamily === 30 /*AF_INET6*/) {
          // For "add(8)", refer to https://github.com/NativeScript/ios-runtime/issues/1017
          sinAddr = interop.handleof(addr.ifa_addr).add(8);
        }

        if (sinAddr) {
          const addrStr = interop.alloc(MAX_ADDRLEN);
          const result = inet_ntop(sinFamily, sinAddr, addrStr, MAX_ADDRLEN);
          if (result) {
            const addr = NSString.stringWithUTF8String(addrStr).toString();
            let address = {
              address: addr,
              type: sinFamily,
              adapterName: adapterName
            };
            // value == null does do what you've asked: Checks that value is null or undefined
            if (interfaceCardName == null && ipAddressType == null) {
              addresses.push(address);
            } else if (adapterName === interfaceCardName && ipAddressType == null) {
              addresses.push(address);
            } else if (adapterName === interfaceCardName && ipAddressType === sinFamily) {
              addresses = [];
              addresses.push(address);
              return addresses;
            }
          }
        }
        tempAddrPtr = <interop.Reference<ifaddrs>>addr.ifa_next;
      }
      freeifaddrs(interfacesPtr);
    }
    return addresses;
  }
}
