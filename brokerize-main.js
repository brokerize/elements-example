/* eslint-disable no-unused-vars */

/**
 * The following typedef imports enable code completion in VS Code:
 */
/** @typedef {import("@brokerize/elements").Client.AuthorizedApiContext} AuthorizedApiContext} */
/** @typedef {import("@brokerize/elements").Client} BrokerizeClient} */
/** @typedef {import("@brokerize/elements").Elements} BrokerizeElements} */
/** @typedef {import("@brokerize/elements").BrokerizeMainElement} BrokerizeMainElement} */
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

/* this changes when the user logs in/out of brokerize or starts/ends guest sessions */
/**
 * @type {AuthorizedApiContext}
 */
let globalApiCtx = null;

/* let's render everything in the #content element */
const $el = document.getElementById("content");

/**
 * @type {BrokerizeMainElement}
 */
let brokerizeMainElement;

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
        acquireBrokerizeGuestUser();
    } else {
        globalApiCtx = client.createAuthorizedContext(cfg, (updatedTokens) => {
            console.log("tokens where updated");
            storeTokens(updatedTokens);
        });
        globalApiCtx.subscribeLogout((err) => {
            console.log(
                err,
                "guest user has been logged out from brokerize API."
            );
            acquireBrokerizeGuestUser();
        });

        setUpModalPortal(globalApiCtx);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("verifysession")) {
            const code = urlParams.get("code");
            const ticketId = urlParams.get("ticketId");
            globalApiCtx.confirmOAuth({ code, ticketId }).then(
                () => {
                    cleanUpUrl();
                    showMain();
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
            showMain();
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
    });
}

/* theme configuration. example themes are available under https://app.brokerize.com/theming/ */
const theme = {
    layout: "block",
    logoStyle: "light",
    tokens: {
        // 'zl-color-primary-base': 'red', /* just a flashy example */
    },
};

function resetRenderTo() {
    brokerizeMainElement && brokerizeMainElement.destroy();
    $el.innerHTML = "";
    return $el;
}

function showMain() {
    if (!globalApiCtx) {
        return alert("you must authorize first.");
    }

    brokerizeMainElement = Brokerize.Elements.createBrokerizeMain({
        theme,
        renderTo: resetRenderTo(),
        authorizedApiContext: globalApiCtx,
        returnToUrl: "http://localhost:8080/brokerize-main.html",
    });
}

function acquireBrokerizeGuestUser() {
    console.log("logging in as guest");
    client.createGuestUser().then(
        (authCtxCfg) => {
            setLogin(authCtxCfg);
        },
        (err) => showError(err)
    );
}

async function startExampleOrderFlow() {
    brokerizeMainElement.navigation.startOrderFlow({
        security: {
            name: "Apple",
            selector: { isin: "US0378331005" },
        },
        initialOrderCreateValues: {
            direction: "buy",
            orderModel: "limit",
            limit: 15,
        },
    });
}

initSessionIf();
