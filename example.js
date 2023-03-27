/* eslint-disable no-unused-vars */

/**
 * The following typedef imports enable code completion in VS Code:
 */
/** @typedef {import("@brokerize/elements").Client} BrokerizeClient} */
/** @typedef {import("@brokerize/elements").Elements} BrokerizeElements} */
/** @typedef {import("@brokerize/elements").BrokerizeElement} BrokerizeElement} */
/** @typedef {{ Client: BrokerizeClient; Elements:BrokerizeElements }} BrokerizeBundle} */
const Brokerize = /** @type {BrokerizeBundle} */ (window.Brokerize);

const config = window.BROKERIZE_CONFIG;

if (!config || !config.CLIENT_ID) {
    alert(
        "no config could be found. Please include config.js in your HTML file."
    );
    throw new Error("No config provided");
}

const client = new Brokerize.Client.Brokerize({
    // API configuration
    basePath: config.API_URL,
    clientId: config.CLIENT_ID,
    cognito: {
        UserPoolId: "eu-central-1_jRMDxLPQW",
        ClientId: config.COGNITO_CLIENT_ID,
        Endpoint: null,
    },
    // provide global dependencies
    fetch: window.fetch.bind(window),
    createAbortController: () => new AbortController(),
    createWebSocket: (url, protocol) => new WebSocket(url, protocol),
});

/* this changes when the user logs in/out of brokerize or starts/ends guest sessions */
let globalApiCtx = null;

/* let's render everything in the #content element */
const $el = document.getElementById("content");

function setLastUsedPortfolio(id) {
    window.localStorage.setItem("lastportfolio", id);
}

function getLastUsedPortfolio() {
    return window.localStorage.getItem("lastportfolio")||null;
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

function setLogin(authCtxCfg) {
    sessionStorage.setItem("brokerize", JSON.stringify(authCtxCfg));
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
        globalApiCtx = client.createAuthorizedContext(cfg);
        globalApiCtx.subscribeLogout((err) => {
            console.log(
                err,
                "guest user has been logged out from brokerize API."
            );
            showLogin();
        });

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

/* theme configuration. example themes are available under https://app.brokerize.com/theming/ */
const renderConfig = {
    theme: {
        name: "Default",
        icon: "circlehollow",
        id: "default",
        layout: "columns",
        logoStyle: "light",
        tokens: {
            "zl-border-radius": ".3rem",
            "zl-notification-bg-color": "var(--zl-colors-dark1)",
            /* ...many more tokens are available (see theming tool) */
        },
    },
    /* brokerize elements may load required assets like stylesheets. this should be the public path
	   to the brokerize elements "dist" directory */
    assetsPath: "/node_modules/@brokerize/elements/dist",
};

function showBrokerLogin(brokerName) {
    /* if required, store the state of the app here (e.g. id of current view in sessionStorage). */
    // storeAppStateInSessionStorage();

    currentElement = Brokerize.Elements.createBrokerLoginForm({
        renderTo: resetRenderTo(),
        renderConfig,
        brokerName,
        authorizedApiContext: globalApiCtx,
        onExit({ loggedIn }) {
            showPortfolioTable();
        },

        // returnTo URL to use for OAuth based broker logins. Dfaults to window.location.href,
        // but can be overriden (for example if there is a fixed "re-entry" URL)
        returnToUrl: 'http://localhost:8080' 
    });
}

function showBrokerList() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createBrokerList({
        renderConfig,
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
        showOrderForm(currentPortfolioId, isin, {
            direction: "buy",
        });
    }
}

function showPortfolioTable() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createPortfolioTable({
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
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
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
        portfolioId,
        onBuy(opts) {
            showOrderForm(portfolioId, opts.isin, { direction: "buy" });
        },
        onSell(opts) {
            showOrderForm(portfolioId, opts.isin, {
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
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        orderId,
        onNavigate: (linkTarget) => {
            debugger
            showPortfolioView(linkTarget.portfolioId);
        },
    });
}

function showSessionTanForm(sessionId) {
    Brokerize.Elements.createSessionTanForm({
        sessionId,
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
    });
}

function showSessionsTable() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createSessionsTable({
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
        onEnableSessionTan({ sessionId }) {
            showSessionTanForm(sessionId);
        },
    });
}

function showCancelOrderForm(portfolioId, orderId) {
    currentElement = Brokerize.Elements.createCancelOrderForm({
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        orderId,
        portfolioId,
        onExit: () => {
            alert('Order gestrichen... ✅');
            showPortfolioView(portfolioId);
        },
        onNavigate: (linkTarget) => {
            showPortfolioView(linkTarget.portfolioId);
        },
    });
}

function showChangeOrderForm(orderId) {
    currentElement = Brokerize.Elements.createChangeOrderForm({
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        orderId,
        onExit: () => resetRenderTo(),
        onNavigate: (linkTarget) => {
            debugger;
            showPortfolioView(linkTarget.portfolioId);
        },
    });
}

function showOrderForm(portfolioId, isin, initialOrder) {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    currentElement = Brokerize.Elements.createOrderForm({
        renderConfig,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,

        portfolioId,
        isin,

        initialOrder,

        // preferredExchangeId: 4, // a preferred exchange to pre-select in the OrderFor (if allowed) (XETRA: 4, Nasdaq: 45, NYSE: 21, ...)
        // initialOrder: {
        // 	/* may set default values for direction, orderModel, limit, stop, stopLimit, stopLoss, validity */
        // 	direction: 'sell',
        // 	orderModel: 'limit',
        // 	limit: 25,
        // 	validity: {
        // 		type: 'GFD'
        // 	}
        // },

        onOrderCreated(createdTrade) {
            showReceipt(createdTrade.orderId);
        },
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
    const portfolio = portfolios.find(p=>p.id == portfolioId);

    if (!portfolio) {
        return null;
    }

    const {brokers} = await globalApiCtx.getBrokers();
    const broker = brokers.find(broker=>broker.brokerName == portfolio.brokerName);
    return {
        brokerDisplayName: broker.displayName,
        portfolio: portfolio.portfolioName
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
            renderConfig,
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
        showOrderForm(portfolioId, 'US0378331005', {
            direction: "buy",
            orderModel: "limit",
            limit: 15,
        });
    }
}

initSessionIf();
