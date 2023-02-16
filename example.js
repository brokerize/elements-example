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
	alert('no config could be found. Please include config.js in your HTML file.');
	throw new Error("No config provided");
}

const client = new Brokerize.Client.Brokerize({
	// API configuration
	basePath: config.API_URL,
	clientId: config.CLIENT_ID,
	cognito: {
		UserPoolId: 'eu-central-1_jRMDxLPQW',
		ClientId: config.COGNITO_CLIENT_ID,
		Endpoint: null
	},
	// provide global dependencies
	fetch: window.fetch.bind(window),
	createAbortController: () => new AbortController(),
	createWebSocket: (url, protocol) => new WebSocket(url, protocol)
});

/* this changes when the user logs in/out of brokerize or starts/ends guest sessions */
let globalApiCtx = null;

/* let's render everything in the #content element */
const $el = document.getElementById('content').attachShadow({
	mode: 'open'
});

/**
 * @type {BrokerizeElement}
 */
let currentElement;

let currentPortfolioId = null;
function setCurrentPortfolioId(id) {
	currentPortfolioId = id;
	document.getElementById('big-buy-button').style.display = id
		? 'inline'
		: 'none';
}

function resetRenderTo() {
	currentElement && currentElement.destroy();
	setCurrentPortfolioId(null);
	$el.innerHTML = '<link type="text/css" rel="stylesheet" href="node_modules/@brokerize/elements/dist/style.css">';
	return $el;
}

function showError(err) {
	alert('ERROR: ' + JSON.stringify(err));
}

function setLogin(authCtxCfg) {
	sessionStorage.setItem('brokerize', JSON.stringify(authCtxCfg));
	initSessionIf();
}

function cleanUpUrl() {
	const url = new URL(window.location.href);
	for (const key of ['verifysession', 'code', 'ticketId']) {
		url.searchParams.delete(key);
	}
	window.location.replace(url);
}

/* restore session from sessionStorage, if possible */
function initSessionIf() {
	const scfg = sessionStorage.getItem('brokerize');
	const cfg = scfg ? JSON.parse(scfg) : null;

	if (!cfg) {
		showLogin();
	} else {
		globalApiCtx = client.createAuthorizedContext(cfg);
		globalApiCtx.subscribeLogout((err)=>{
			console.log(err, 'guest user has been logged out from brokerize API.');
			showLogin();
		});

		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('verifysession')) {
			const code = urlParams.get('code');
			const ticketId = urlParams.get('ticketId');
			globalApiCtx.confirmOAuth({ code, ticketId }).then(
				() => {
					cleanUpUrl();
					showSessionsTable();
				},
				(err) => {
					showError(
						'An error occured when trying to confirm the OAuth-based broker login: ' +
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
const theme = {
	name: 'Default',
	icon: 'circlehollow',
	id: 'default',
	layout: 'columns',
	logoStyle: 'light',
	tokens: {
		'zl-border-radius': '.3rem',
		'zl-notification-bg-color': 'var(--zl-colors-dark1)'
		/* ...many more tokens are available (see theming tool) */
	}
};

function showBrokerLogin(brokerName) {
	Brokerize.Elements.createBrokerLoginForm({
		renderTo: resetRenderTo(),
		theme,
		brokerName,
		authorizedApiContext: globalApiCtx,
		onExit({ loggedIn }) {
			alert('Login erfolgreich?' + loggedIn);
			resetRenderTo();
		}
	});
}

function showBrokerList() {
	if (!globalApiCtx) {
		return alert('you must authorize first.');
	}

	Brokerize.Elements.createBrokerList({
		theme,
		renderTo: resetRenderTo(),
		authorizedApiContext: globalApiCtx,
		onLogin({ brokerName }) {
			showBrokerLogin(brokerName);
		}
	});
}

function buy() {
	const isin = prompt(
		'enter ISIN that you want to trade in the current portfolio please',
		'US0378331005'
	);
	if (isin) {
		showOrderForm(currentPortfolioId, isin);
	}
}

function showPortfolioTable() {
	if (!globalApiCtx) {
		return alert('you must authorize first.');
	}

	Brokerize.Elements.createPortfolioTable({
		theme,
		renderTo: resetRenderTo(),
		authorizedApiContext: globalApiCtx,
		onNavigate(portfolio) {
			showPortfolioView(portfolio.id);
		}
	});
}

function showPortfolioView(portfolioId) {
	if (!globalApiCtx) {
		return alert('you must authorize first.');
	}

	Brokerize.Elements.createPortfolioView({
		theme,
		renderTo: resetRenderTo(),
		authorizedApiContext: globalApiCtx,
		portfolioId,
		onBuy(opts) {
			alert('TODO: show buy form for ' + opts.isin);
		},
		onSell(opts) {
			alert(
				'TODO: show sell form for ' +
					opts.isin +
					' (current availableSize: ' +
					opts.availableSize +
					')'
			);
		},
		onCancelOrder(opts) {
			alert('TODO: show cancel order process for ' + opts.orderId);
		},
		onChangeOrder(opts) {
			alert('TODO: show change order process for ' + opts.orderId);
		},
		onShowReceipt(opts) {
			alert('TODO: show receipt for ' + opts.orderId);
		}
	});
	setCurrentPortfolioId(portfolioId);
}

function showSessionsTable() {
	if (!globalApiCtx) {
		return alert('you must authorize first.');
	}

	Brokerize.Elements.createSessionsTable({
		theme,
		renderTo: resetRenderTo(),
		authorizedApiContext: globalApiCtx,
		onEnableSessionTan({ sessionId }) {
			alert('TODO: show a modal with createSessionTanForm.');
		}
	});
}

function showOrderForm(portfolioId, isin) {
	if (!globalApiCtx) {
		return alert('you must authorize first.');
	}

	Brokerize.Elements.createOrderForm({
		theme,
		renderTo: resetRenderTo(),
		authorizedApiContext: globalApiCtx,

		portfolioId,
		isin,

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
			alert('order created: ' + JSON.stringify(createdTrade));
			resetRenderTo();
		}
	});
}

function logInAsGuest() {
	console.log('logging in as guest');
	client.createGuestUser().then(
		(authCtxCfg) => {
			setLogin(authCtxCfg);
		},
		(err) => showError(err)
	);
}

function showLogin() {
	if (config.COGNITO_CLIENT_ID) {
		/* the client supports brokerize user logins. */
		Brokerize.Elements.createLoginForm({
			renderTo: resetRenderTo(),
			theme,
			client,
			onGuestLogin() {
				logInAsGuest();
			},
			onLogin(authCtxCfg) {
				setLogin(authCtxCfg);
			}
		});
	} else {
		/* the client only supports guest users */
		logInAsGuest();
	}
	
}

/* ... more calls to Brokerize.Elements.createXXXXXX to be added here ... */

initSessionIf();
