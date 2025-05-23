/* eslint-disable no-unused-vars */

/**
 * The following typedef imports enable code completion in VS Code:
 */
/** @typedef {import("@brokerize/elements").Client.AuthorizedApiContext} AuthorizedApiContext} */
/** @typedef {import("@brokerize/elements").Client} BrokerizeClient} */
/** @typedef {import("@brokerize/elements").Elements} BrokerizeElements} */
/** @typedef {import("@brokerize/elements").BrokerizeElement} BrokerizeElement} */
/** @typedef {import("@brokerize/elements").SecurityQuotesProvider} SecurityQuotesProvider} */
/** @typedef {import("@brokerize/elements")} BrokerizeBundle} */
const Brokerize = /** @type {BrokerizeBundle} */ (window.Brokerize);

const config = window.BROKERIZE_CONFIG;

if (!config || !config.CLIENT_ID) {
    alert(
        "no config could be found. Please include config.js in your HTML file."
    );
    throw new Error("No config provided");
}

// If you would like to self-host static assets instead of using the brokerize CDN under https://assets.brokerize.com,
// configure this:
// Brokerize.Elements.configure({
//     assetsPath: '<MY-HOSTING-PATH-FOR>/node_modules/@brokerize/elements/assets'
// })

const client = new Brokerize.Client.Brokerize({
    // API configuration
    basePath: config.API_URL,
    basePathCryptoService: config.API_URL_CRYPTO_SERVICE,
    clientId: config.CLIENT_ID,
    // provide global dependencies
    fetch: window.fetch.bind(window),
    createAbortController: () => new AbortController(),
    createWebSocket: (url, protocol) => new WebSocket(url, protocol),
});

/**
 * An example implementation of a `SecurityQuotesProvider`. Note that this is optional (see below). If you want
 * your app's security quotes to show up in the OrderForm, implement this. This is just an illustration of how
 * it can work (it just pushes random quotes every second).
 *
 * @type {SecurityQuotesProvider}
 */
const quotesProvider = (opts) => {
    return {
        async loadMeta() {
            if (opts.securityQuotesToken != null) {
                /* securityQuotesToken is set. this means that brokerize can provide
                   the quotes itself. if we have a very good quality for the selected
                   security/exchange combination, we might prefer it over the brokerize-provided
                   prices. in our example, this is not the case! so we just return null
                   here and let brokerize use its own (or the broker's) prices:  */
                return null;
            }

            /* load meta data about the selected quote (we wait 3s to simulate a slow API call) */
            await new Promise((resolve) => setTimeout(resolve, 3000));
            return {
                currency: "EUR",
                decimals: 2,
                quoteSourceName: "My Quotes Provider",
            };
        },
        subscribe(cb) {
            const intvl = setInterval(() => {
                cb(null, {
                    ask: {
                        date: new Date(),
                        quote: 42 + Math.random(),
                    },
                    bid: {
                        date: new Date(),
                        quote: 84 + Math.random(),
                    },
                });
            }, 1000);

            return {
                unsubscribe() {
                    clearInterval(intvl);
                },
            };
        },
    };
};

/* this changes when the user logs in/out of brokerize or starts/ends guest sessions */
/**
 * @type {AuthorizedApiContext}
 */
let globalApiCtx = null;

/* let's render everything in the #content element */
const $el = document.getElementById("content");

function setLastUsedPortfolio(id) {
    window.localStorage.setItem("lastportfolio", id);
}

function getLastUsedPortfolio() {
    return window.localStorage.getItem("lastportfolio") || null;
}

/**
 * @type {BrokerizeElement}
 */
let currentElement;

let currentPortfolioId = null;
function setCurrentPortfolioId(id) {
    currentPortfolioId = id;
    document.getElementById("big-buy-button").style.display = id
        ? "inline"
        : "none";
}

function resetRenderTo() {
    currentElement && currentElement.destroy();
    setCurrentPortfolioId(null);
    $el.innerHTML = "";
    return $el;
}

function showError(err) {
    alert("ERROR: " + JSON.stringify(err));
}

function storeTokens(authCtxCfg) {
    sessionStorage.setItem("brokerize", JSON.stringify(authCtxCfg));
}

function setLogin(authCtxCfg) {
    storeTokens(authCtxCfg);
    initSessionIf();
}

function cleanUpUrl() {
    const url = new URL(window.location.href);
    for (const key of ["verifysession", "code", "ticketId"]) {
        url.searchParams.delete(key);
    }
    window.location.replace(url);
}

/* restore session from sessionStorage, if possible */
function initSessionIf() {
    const scfg = sessionStorage.getItem("brokerize");
    const cfg = scfg ? JSON.parse(scfg) : null;

    if (!cfg) {
        showLogin();
    } else {
        globalApiCtx = client.createAuthorizedContext(cfg, (updatedTokens) => {
            console.log('tokens where updated');
            storeTokens(updatedTokens);
        });
        globalApiCtx.subscribeLogout((err) => {
            console.log(
                err,
                "guest user has been logged out from brokerize API."
            );
            showLogin();
        });

        setUpModalPortal(globalApiCtx);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("verifysession")) {
            const code = urlParams.get("code");
            const ticketId = urlParams.get("ticketId");
            globalApiCtx.confirmOAuth({ code, ticketId }).then(
                () => {
                    cleanUpUrl();
                    showSessionsTable();
                },
                (err) => {
                    showError(
                        "An error occured when trying to confirm the OAuth-based broker login: " +
                            JSON.stringify(err)
                    );
                    cleanUpUrl();
                }
            );
        } else {
            showBrokerList();
        }
    }
}

let modalHost = null;
function setUpModalPortal(authorizedApiContext) {
    modalHost?.destroy();
    modalHost = Brokerize.Elements.createModalHost({
        authorizedApiContext,
        renderTo: document.getElementById("brokerize-modal-portal"),
        theme,
        // saveDownloadedFile: async (download) => {
        //    alert('DOWNLOAD');
        //    const downloadUrl = URL.createObjectURL(download.blob);
        //    const a = document.createElement('a');
        //    a.href = downloadUrl;
        //    a.download = download.filename;
        //    document.body.appendChild(a);
        //    a.click();
        // }
    });

    // // Example for overriding methods on the modalService:
    // Brokerize.Elements.modalService.override({
    //     showDetailedTable(table) {
    //         setTimeout(()=>{
    //             alert("custom implementation of showDetailedTable: " + JSON.stringify(table));
    //         }, 200);
    //     }
    // })
}

/* theme configuration. example themes are available under https://app.brokerize.com/theming/ */
const theme = {
    layout: "block",
    logoStyle: "light",
    tokens: {
        // 'zl-color-primary-base': 'red', /* just a flashy example */
    },
};

function showBrokerLogin(brokerName) {
    /* if required, store the state of the app here (e.g. id of current view in sessionStorage). */
    // storeAppStateInSessionStorage();

    currentElement = Brokerize.Elements.createBrokerLoginForm({
        renderTo: resetRenderTo(),
        theme,
        brokerName,
        authorizedApiContext: globalApiCtx,
        // onRedirect(url) {
        //     const urlObject = new URL(url);
        //     urlObject.searchParams.set('state', 'my-state-string');
        //     window.location.href = urlObject.toString();
        // },
        onExit({ loggedIn }) {
            showPortfolioTable();
        },

        // returnTo URL to use for OAuth based broker logins. Dfaults to window.location.href,
        // but can be overriden (for example if there is a fixed "re-entry" URL)
        returnToUrl: "http://localhost:8080",

        // example code for interacting with a secure credential storage. This interface can be used to store credentials *in native apps*
        // web apps MUST NOT store those credentials - there is no browser API to do this. Web apps simply rely on the browser's
        // password manager functionality.
        // credentialsStore: {
        //     async storeCredentials(label, brokerName, value) {
        //         console.log('ask user if they want to store their credentials with name ' + label + ' in the secure storage');
        //         secureStorage[brokerName] = value;
        //     },
        //     async loadCredentials(brokerName) {
        //         console.log('prompt user to load the credentials from the secure storage')
        //         return secureStorage[brokerName];
        //     }
        // }
    });
}

function showBrokerList() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createBrokerList({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
        onLogin({ brokerName }) {
            showBrokerLogin(brokerName);
        },
    });
}

function buy() {
    const isin = prompt(
        "enter ISIN that you want to trade in the current portfolio please",
        "US0378331005"
    );
    if (isin) {
        showOrderForm(
            currentPortfolioId,
            { isin },
            {
                direction: "buy",
            }
        );
    }
}

function showPortfolioTable() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createPortfolioTable({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
        // hideInactivePortfolios: true, /* true to hide portfolios that have no active broker session */
        onNavigate(portfolio) {
            showPortfolioView(portfolio.id);
        },
    });
}

function showPortfolioView(portfolioId) {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    setLastUsedPortfolio(portfolioId);

    currentElement = Brokerize.Elements.createPortfolioView({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
        portfolioId,
        // openExternalLink(url) {
        //   open the external URL here. For example, this can be used in mobile apps to use a custom way of showing external content.
        // },
        onBuy(opts) {
            showOrderForm(portfolioId, opts.security, { direction: "buy" });
        },
        onSell(opts) {
            showOrderForm(portfolioId, opts.security, {
                direction: "sell",
                size: opts.availableSize,
            });
        },
        onCancelOrder(opts) {
            showCancelOrderForm(portfolioId, opts.orderId);
        },
        onChangeOrder(opts) {
            showChangeOrderForm(opts.orderId);
        },
        onShowReceipt(opts) {
            showReceipt(opts.orderId);
        },
    });
    setCurrentPortfolioId(portfolioId);
}

function showReceipt(orderId) {
    Brokerize.Elements.createOrderReceipt({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        orderId,
        onNavigate: (linkTarget) => {
            showPortfolioView(linkTarget.portfolioId);
        },
    });
}

Brokerize.Elements.modalService.override({
    // showSessionTanModal(sessionId) {
    //     overriddenShowSessionTanForm(sessionId);
    // }
    // showToast(opts) {
    //     alert('custom implementation of showToast: ' + JSON.stringify(opts));
    // }
})


// function overriddenShowSessionTanForm(sessionId) {
//     currentElement = Brokerize.Elements.createSessionTanForm({
//         sessionId,
//         theme,
//         renderTo: resetRenderTo(),
//         authorizedApiContext: globalApiCtx,
//         onExit: ({enabled}) => {
//             if (enabled) {
//                 alert('Session-TAN aktiviert ✅');
//             }
//             showSessionsTable();
//         }
//     });
// }

function showSessionsTable() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createSessionsTable({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
    });
}

function showCancelOrderForm(portfolioId, orderId) {
    currentElement = Brokerize.Elements.createCancelOrderForm({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        orderId,
        portfolioId,
        onExit: () => {
            alert("Order gestrichen... ✅");
            showPortfolioView(portfolioId);
        },
        onNavigate: (linkTarget) => {
            showPortfolioView(linkTarget.portfolioId);
        },

        // reportingTag: 'optionalTagForOrderReports'
    });
}

function showChangeOrderForm(orderId) {
    currentElement = Brokerize.Elements.createChangeOrderForm({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        orderId,
        onExit: () => {
            alert("Order bearbeitet... ✅");
            const portfolioId = getLastUsedPortfolio();
            if (portfolioId) {
                showPortfolioView(portfolioId);
            } else {
                resetRenderTo();
            }
        },
        onNavigate: (linkTarget) => {
            showPortfolioView(linkTarget.portfolioId);
        },
        // reportingTag: 'optionalTagForOrderReports'
    });
}

function showOrderForm(portfolioId, security, initialOrder) {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createOrderForm({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        portfolioId,
        security,

        // preferredExchangeId: 4, // a preferred exchange to pre-select in the OrderFor (if allowed) (XETRA: 4, Nasdaq: 45, NYSE: 21, ...)
        // initialOrder: {
        // 	/* may set default values for direction, size, orderModel, limit, stop, stopLimit, stopLoss, validity */
        // 	direction: 'sell',
        // 	orderModel: 'limit',
        // 	limit: 25,
        // 	validity: {
        // 		type: 'GFD'
        // 	}
        // },
        initialOrder,

        supportLink: {
            emailSubject: "Anfrage zu Trading mit elements-example",
        },

        onOrderCreated(createdTrade) {
            showReceipt(createdTrade.orderId);
        },

        onOrderError(details) {
            console.error("order error", details);
        },

        // if openExternalLink is provided, external URLs (e.g. for cost estimation documents)
        // will be opened with this function.
        // openExternalLink(url) {
        //     alert('TODO: navigate to the URL: ' + url);
        // }

        // if saveDownloadedFile is provided, this will be called when the user saves a document (e.g. cost estimation PDF files).
        async saveDownloadedFile(download) {
            const downloadUrl = URL.createObjectURL(download.blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = download.filename;
            document.body.appendChild(a);
            a.click();
        },

        /* the quotesProvider is optional! if you set it, you should add a meaningful implementation that
           actually retrieves code from your infrastructure. If you don't have quotes in your
           application, remove the following line. */
        quotesProvider,

        // reportingTag: 'optionalTagForOrderReports'

        // if you want to lock the order direction (buy/sell) and hide the order direction switch, set both of these to true:
        // lockOrderDirection: true
        // hideOrderDirection: true
    });
}

function logInAsGuest() {
    console.log("logging in as guest");
    client.createGuestUser().then(
        (authCtxCfg) => {
            setLogin(authCtxCfg);
        },
        (err) => showError(err)
    );
}

async function loadPortfolioInfo(portfolioId) {
    const { portfolios } = await globalApiCtx.getPortfolios();
    const portfolio = portfolios.find((p) => p.id == portfolioId);

    if (!portfolio) {
        return null;
    }

    const { brokers } = await globalApiCtx.getBrokers();
    const broker = brokers.find(
        (broker) => broker.brokerName == portfolio.brokerName
    );
    return {
        brokerDisplayName: broker.displayName,
        portfolio: portfolio.portfolioName,
    };
}

async function resolvePortfolioName() {
    const portfolioId = prompt("Please provide the portfolio id to look up");
    if (!portfolioId) {
        return;
    }

    const data = await loadPortfolioInfo(portfolioId);
    alert(JSON.stringify(data, null, 4));
}

function showLogin() {
    if (config.COGNITO_CLIENT_ID) {
        /* the client supports brokerize user logins. */
        currentElement = Brokerize.Elements.createLoginForm({
            renderTo: resetRenderTo(),
            theme,
            client,
            onGuestLogin() {
                logInAsGuest();
            },
            onLogin(authCtxCfg) {
                setLogin(authCtxCfg);
            },
        });
    } else {
        /* the client only supports guest users */
        logInAsGuest();
    }
}

/**
 * Helper function for selecting the last used portfolio of the user, if the user is logged in to
 * to that portfolio.
 *
 * If that is not the case, select the first portfolio that can be used for trading.,
 *
 * Otherwise, returns null.
 */
async function selectPortfolio(lastUsedId) {
    const { portfolios } = await globalApiCtx.getPortfolios();
    const onlinePortfolioIds = portfolios
        .filter((p) => p.sessionIds.length > 0)
        .map((p) => p.id);
    if (lastUsedId && onlinePortfolioIds.includes(lastUsedId)) {
        return lastUsedId;
    }
    return onlinePortfolioIds.length ? onlinePortfolioIds[0] : null;
}

async function startExampleOrderFlow() {
    const portfolioId = await selectPortfolio(getLastUsedPortfolio());
    if (!portfolioId) {
        showBrokerList();
    } else {
        showOrderForm(
            portfolioId,
            { isin: "US0378331005" },
            {
                direction: "buy",
                orderModel: "limit",
                limit: 15,
            }
        );
    }
}

initSessionIf();
