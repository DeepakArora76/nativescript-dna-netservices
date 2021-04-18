import { Observable, Observer } from "rxjs";
import { ZeroConf, zeroConfStatus } from "./netservice.common";

export class ZeroConfServiceBrowser {
  searchForBrowsableDomains(): Observable<ZeroConf> {
    return new Observable((observer: Observer<ZeroConf>) => {
      let netServiceBrowser = NSNetServiceBrowser.alloc().init();
      netServiceBrowser.delegate = ZeroConfServiceBrowserDelegate.new().initWithObserver(observer);
      netServiceBrowser.searchForBrowsableDomains();
      return () => {
        netServiceBrowser.stop();
        netServiceBrowser.delegate = null;
        netServiceBrowser = null;
      }
    });
  }

  searchForRegistrationDomains(): Observable<ZeroConf> {
    return new Observable((observer: Observer<ZeroConf>) => {
      let netServiceBrowser = NSNetServiceBrowser.alloc().init();
      netServiceBrowser.delegate = ZeroConfServiceBrowserDelegate.new().initWithObserver(observer);
      netServiceBrowser.searchForRegistrationDomains();
      return () => {
        netServiceBrowser.stop();
        netServiceBrowser.delegate = null;
        netServiceBrowser = null;
      }
    });
  }

  searchForServicesOfTypeInDomain(
    type: string,
    domain: string
  ): Observable<ZeroConf> {
    const obserable: Observable<ZeroConf> = new Observable(
      (observer: Observer<ZeroConf>) => {
        let netServiceBrowser = NSNetServiceBrowser.alloc().init();
        netServiceBrowser.delegate = ZeroConfServiceBrowserDelegate.new().initWithObserver(observer);
        netServiceBrowser.searchForServicesOfTypeInDomain(type, domain);
        return () => {
          netServiceBrowser.stop();
          netServiceBrowser.delegate = null;
          netServiceBrowser = null;
        }
      }
    );

    return obserable;
  }
}

@NativeClass()
class ZeroConfServiceBrowserDelegate extends NSObject implements NSNetServiceBrowserDelegate {
  // Note: This ObjCProtocols is needed.
  public static ObjCProtocols = [NSNetServiceBrowserDelegate];

  private _observer: Observer<ZeroConf>;

  static new(): ZeroConfServiceBrowserDelegate {
    return <ZeroConfServiceBrowserDelegate>super.new();
  }

  initWithObserver(
    observer: Observer<ZeroConf>
  ): ZeroConfServiceBrowserDelegate {
    this._observer = observer;
    return this;
  }

  netServiceBrowserDidFindDomainMoreComing(
    browser: NSNetServiceBrowser,
    domain: string,
    moreComing: boolean
  ): void {
    let status = zeroConfStatus.add;
    status |= moreComing
      ? zeroConfStatus.moreComing
      : zeroConfStatus.stopComing;
    this._observer.next(new ZeroConf({ status, domain }));
  }

  netServiceBrowserDidFindServiceMoreComing(
    browser: NSNetServiceBrowser,
    service: NSNetService,
    moreComing: boolean
  ): void {
    let status = zeroConfStatus.add;
    status |= moreComing
      ? zeroConfStatus.moreComing
      : zeroConfStatus.stopComing;

    this._observer.next(
      new ZeroConf({
        status: status,
        name: service.name,
        type: service.type,
        domain: service.domain,
        hostName: service.hostName,
        port: service.port
      })
    );
  }

  netServiceBrowserDidNotSearch?(
    browser: NSNetServiceBrowser,
    errorDict: NSDictionary<string, number>
  ): void {
    const errCode = Number(errorDict.objectForKey("errorCode"));
    const status = zeroConfStatus.failed;
    const zc = new ZeroConf({ status });
    this._observer.error({ errorCode: errCode, zeroConf: zc });
  }

  netServiceBrowserDidRemoveDomainMoreComing?(
    browser: NSNetServiceBrowser,
    domain: string,
    moreComing: boolean
  ): void {
    let status = zeroConfStatus.remove;
    status |= moreComing
      ? zeroConfStatus.moreComing
      : zeroConfStatus.stopComing;

    this._observer.next(new ZeroConf({ status, domain }));
  }

  netServiceBrowserDidRemoveServiceMoreComing?(
    browser: NSNetServiceBrowser,
    service: NSNetService,
    moreComing: boolean
  ): void {
    let status = zeroConfStatus.remove;
    status |= moreComing
      ? zeroConfStatus.moreComing
      : zeroConfStatus.stopComing;

    this._observer.next(
      new ZeroConf({
        status: status,
        name: service.name,
        type: service.type,
        domain: service.domain,
        hostName: service.hostName,
        port: service.port
      })
    );
  }

  netServiceBrowserDidStopSearch?(browser: NSNetServiceBrowser): void {
    const status = zeroConfStatus.serviceEnds;
    this._observer.next(new ZeroConf({ status }));
  }

  netServiceBrowserWillSearch?(browser: NSNetServiceBrowser): void {
    const status = zeroConfStatus.serviceBegins;
    this._observer.next(new ZeroConf({ status }));
  }
}
