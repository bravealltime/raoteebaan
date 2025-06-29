/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./components/ErrorBoundary.tsx":
/*!**************************************!*\
  !*** ./components/ErrorBoundary.tsx ***!
  \**************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @chakra-ui/react */ \"@chakra-ui/react\");\n/* harmony import */ var _barrel_optimize_names_FaExclamationTriangle_react_icons_fa__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! __barrel_optimize__?names=FaExclamationTriangle!=!react-icons/fa */ \"(pages-dir-node)/__barrel_optimize__?names=FaExclamationTriangle!=!./node_modules/react-icons/fa/index.mjs\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__]);\n_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\nclass ErrorBoundary extends (react__WEBPACK_IMPORTED_MODULE_1___default().Component) {\n    constructor(props){\n        super(props);\n        this.state = {\n            hasError: false\n        };\n    }\n    static getDerivedStateFromError(error) {\n        return {\n            hasError: true,\n            error\n        };\n    }\n    componentDidCatch(error, errorInfo) {\n        console.error('Error caught by boundary:', error, errorInfo);\n    }\n    render() {\n        if (this.state.hasError) {\n            return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Box, {\n                minH: \"100vh\",\n                display: \"flex\",\n                alignItems: \"center\",\n                justifyContent: \"center\",\n                bgGradient: \"linear(to-br, #e3f2fd, #bbdefb)\",\n                p: 4,\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.VStack, {\n                    spacing: 6,\n                    textAlign: \"center\",\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Icon, {\n                            as: _barrel_optimize_names_FaExclamationTriangle_react_icons_fa__WEBPACK_IMPORTED_MODULE_3__.FaExclamationTriangle,\n                            w: 16,\n                            h: 16,\n                            color: \"red.500\"\n                        }, void 0, false, {\n                            fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/components/ErrorBoundary.tsx\",\n                            lineNumber: 40,\n                            columnNumber: 13\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Text, {\n                            fontSize: \"2xl\",\n                            fontWeight: \"bold\",\n                            color: \"gray.800\",\n                            children: \"เกิดข้อผิดพลาด\"\n                        }, void 0, false, {\n                            fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/components/ErrorBoundary.tsx\",\n                            lineNumber: 41,\n                            columnNumber: 13\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Text, {\n                            color: \"gray.600\",\n                            maxW: \"500px\",\n                            children: \"ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองรีเฟรชหน้าหรือติดต่อผู้ดูแลระบบ\"\n                        }, void 0, false, {\n                            fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/components/ErrorBoundary.tsx\",\n                            lineNumber: 44,\n                            columnNumber: 13\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Button, {\n                            colorScheme: \"blue\",\n                            onClick: ()=>{\n                                this.setState({\n                                    hasError: false\n                                });\n                                window.location.reload();\n                            },\n                            children: \"รีเฟรชหน้า\"\n                        }, void 0, false, {\n                            fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/components/ErrorBoundary.tsx\",\n                            lineNumber: 47,\n                            columnNumber: 13\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/components/ErrorBoundary.tsx\",\n                    lineNumber: 39,\n                    columnNumber: 11\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/components/ErrorBoundary.tsx\",\n                lineNumber: 31,\n                columnNumber: 9\n            }, this);\n        }\n        return this.props.children;\n    }\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ErrorBoundary);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL2NvbXBvbmVudHMvRXJyb3JCb3VuZGFyeS50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBMEI7QUFDeUM7QUFDWjtBQVd2RCxNQUFNTyxzQkFBc0JQLHdEQUFlO0lBQ3pDUyxZQUFZQyxLQUF5QixDQUFFO1FBQ3JDLEtBQUssQ0FBQ0E7UUFDTixJQUFJLENBQUNDLEtBQUssR0FBRztZQUFFQyxVQUFVO1FBQU07SUFDakM7SUFFQSxPQUFPQyx5QkFBeUJDLEtBQVksRUFBc0I7UUFDaEUsT0FBTztZQUFFRixVQUFVO1lBQU1FO1FBQU07SUFDakM7SUFFQUMsa0JBQWtCRCxLQUFZLEVBQUVFLFNBQTBCLEVBQUU7UUFDMURDLFFBQVFILEtBQUssQ0FBQyw2QkFBNkJBLE9BQU9FO0lBQ3BEO0lBRUFFLFNBQVM7UUFDUCxJQUFJLElBQUksQ0FBQ1AsS0FBSyxDQUFDQyxRQUFRLEVBQUU7WUFDdkIscUJBQ0UsOERBQUNYLGlEQUFHQTtnQkFDRmtCLE1BQUs7Z0JBQ0xDLFNBQVE7Z0JBQ1JDLFlBQVc7Z0JBQ1hDLGdCQUFlO2dCQUNmQyxZQUFXO2dCQUNYQyxHQUFHOzBCQUVILDRFQUFDcEIsb0RBQU1BO29CQUFDcUIsU0FBUztvQkFBR0MsV0FBVTs7c0NBQzVCLDhEQUFDckIsa0RBQUlBOzRCQUFDc0IsSUFBSXJCLDhHQUFxQkE7NEJBQUVzQixHQUFHOzRCQUFJQyxHQUFHOzRCQUFJQyxPQUFNOzs7Ozs7c0NBQ3JELDhEQUFDNUIsa0RBQUlBOzRCQUFDNkIsVUFBUzs0QkFBTUMsWUFBVzs0QkFBT0YsT0FBTTtzQ0FBVzs7Ozs7O3NDQUd4RCw4REFBQzVCLGtEQUFJQTs0QkFBQzRCLE9BQU07NEJBQVdHLE1BQUs7c0NBQVE7Ozs7OztzQ0FHcEMsOERBQUM5QixvREFBTUE7NEJBQ0wrQixhQUFZOzRCQUNaQyxTQUFTO2dDQUNQLElBQUksQ0FBQ0MsUUFBUSxDQUFDO29DQUFFeEIsVUFBVTtnQ0FBTTtnQ0FDaEN5QixPQUFPQyxRQUFRLENBQUNDLE1BQU07NEJBQ3hCO3NDQUNEOzs7Ozs7Ozs7Ozs7Ozs7OztRQU1UO1FBRUEsT0FBTyxJQUFJLENBQUM3QixLQUFLLENBQUM4QixRQUFRO0lBQzVCO0FBQ0Y7QUFFQSxpRUFBZWpDLGFBQWFBLEVBQUMiLCJzb3VyY2VzIjpbIi9Vc2Vycy90aGFyYW51dGhpcmFuc3JldHRhd2F0L0Rlc2t0b3AvcmFvdGVlYmFhbi9jb21wb25lbnRzL0Vycm9yQm91bmRhcnkudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBCb3gsIFRleHQsIEJ1dHRvbiwgVlN0YWNrLCBJY29uIH0gZnJvbSAnQGNoYWtyYS11aS9yZWFjdCc7XG5pbXBvcnQgeyBGYUV4Y2xhbWF0aW9uVHJpYW5nbGUgfSBmcm9tICdyZWFjdC1pY29ucy9mYSc7XG5cbmludGVyZmFjZSBFcnJvckJvdW5kYXJ5U3RhdGUge1xuICBoYXNFcnJvcjogYm9vbGVhbjtcbiAgZXJyb3I/OiBFcnJvcjtcbn1cblxuaW50ZXJmYWNlIEVycm9yQm91bmRhcnlQcm9wcyB7XG4gIGNoaWxkcmVuOiBSZWFjdC5SZWFjdE5vZGU7XG59XG5cbmNsYXNzIEVycm9yQm91bmRhcnkgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQ8RXJyb3JCb3VuZGFyeVByb3BzLCBFcnJvckJvdW5kYXJ5U3RhdGU+IHtcbiAgY29uc3RydWN0b3IocHJvcHM6IEVycm9yQm91bmRhcnlQcm9wcykge1xuICAgIHN1cGVyKHByb3BzKTtcbiAgICB0aGlzLnN0YXRlID0geyBoYXNFcnJvcjogZmFsc2UgfTtcbiAgfVxuXG4gIHN0YXRpYyBnZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IoZXJyb3I6IEVycm9yKTogRXJyb3JCb3VuZGFyeVN0YXRlIHtcbiAgICByZXR1cm4geyBoYXNFcnJvcjogdHJ1ZSwgZXJyb3IgfTtcbiAgfVxuXG4gIGNvbXBvbmVudERpZENhdGNoKGVycm9yOiBFcnJvciwgZXJyb3JJbmZvOiBSZWFjdC5FcnJvckluZm8pIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjYXVnaHQgYnkgYm91bmRhcnk6JywgZXJyb3IsIGVycm9ySW5mbyk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuaGFzRXJyb3IpIHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIDxCb3hcbiAgICAgICAgICBtaW5IPVwiMTAwdmhcIlxuICAgICAgICAgIGRpc3BsYXk9XCJmbGV4XCJcbiAgICAgICAgICBhbGlnbkl0ZW1zPVwiY2VudGVyXCJcbiAgICAgICAgICBqdXN0aWZ5Q29udGVudD1cImNlbnRlclwiXG4gICAgICAgICAgYmdHcmFkaWVudD1cImxpbmVhcih0by1iciwgI2UzZjJmZCwgI2JiZGVmYilcIlxuICAgICAgICAgIHA9ezR9XG4gICAgICAgID5cbiAgICAgICAgICA8VlN0YWNrIHNwYWNpbmc9ezZ9IHRleHRBbGlnbj1cImNlbnRlclwiPlxuICAgICAgICAgICAgPEljb24gYXM9e0ZhRXhjbGFtYXRpb25UcmlhbmdsZX0gdz17MTZ9IGg9ezE2fSBjb2xvcj1cInJlZC41MDBcIiAvPlxuICAgICAgICAgICAgPFRleHQgZm9udFNpemU9XCIyeGxcIiBmb250V2VpZ2h0PVwiYm9sZFwiIGNvbG9yPVwiZ3JheS44MDBcIj5cbiAgICAgICAgICAgICAg4LmA4LiB4Li04LiU4LiC4LmJ4Lit4Lic4Li04LiU4Lie4Lil4Liy4LiUXG4gICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICA8VGV4dCBjb2xvcj1cImdyYXkuNjAwXCIgbWF4Vz1cIjUwMHB4XCI+XG4gICAgICAgICAgICAgIOC4guC4reC4reC4oOC4seC4oiDguYDguIHguLTguJTguILguYnguK3guJzguLTguJTguJ7guKXguLLguJTguJfguLXguYjguYTguKHguYjguITguLLguJTguITguLTguJQg4LiB4Lij4Li44LiT4Liy4Lil4Lit4LiH4Lij4Li14LmA4Lif4Lij4LiK4Lir4LiZ4LmJ4Liy4Lir4Lij4Li34Lit4LiV4Li04LiU4LiV4LmI4Lit4Lic4Li54LmJ4LiU4Li54LmB4Lil4Lij4Liw4Lia4LiaXG4gICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgIGNvbG9yU2NoZW1lPVwiYmx1ZVwiXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHsgaGFzRXJyb3I6IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAg4Lij4Li14LmA4Lif4Lij4LiK4Lir4LiZ4LmJ4LiyXG4gICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICA8L1ZTdGFjaz5cbiAgICAgICAgPC9Cb3g+XG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnByb3BzLmNoaWxkcmVuO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEVycm9yQm91bmRhcnk7ICJdLCJuYW1lcyI6WyJSZWFjdCIsIkJveCIsIlRleHQiLCJCdXR0b24iLCJWU3RhY2siLCJJY29uIiwiRmFFeGNsYW1hdGlvblRyaWFuZ2xlIiwiRXJyb3JCb3VuZGFyeSIsIkNvbXBvbmVudCIsImNvbnN0cnVjdG9yIiwicHJvcHMiLCJzdGF0ZSIsImhhc0Vycm9yIiwiZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yIiwiZXJyb3IiLCJjb21wb25lbnREaWRDYXRjaCIsImVycm9ySW5mbyIsImNvbnNvbGUiLCJyZW5kZXIiLCJtaW5IIiwiZGlzcGxheSIsImFsaWduSXRlbXMiLCJqdXN0aWZ5Q29udGVudCIsImJnR3JhZGllbnQiLCJwIiwic3BhY2luZyIsInRleHRBbGlnbiIsImFzIiwidyIsImgiLCJjb2xvciIsImZvbnRTaXplIiwiZm9udFdlaWdodCIsIm1heFciLCJjb2xvclNjaGVtZSIsIm9uQ2xpY2siLCJzZXRTdGF0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2hpbGRyZW4iXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(pages-dir-node)/./components/ErrorBoundary.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @chakra-ui/react */ \"@chakra-ui/react\");\n/* harmony import */ var next_head__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/head */ \"(pages-dir-node)/./node_modules/next/head.js\");\n/* harmony import */ var next_head__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_head__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_ErrorBoundary__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/ErrorBoundary */ \"(pages-dir-node)/./components/ErrorBoundary.tsx\");\n/* harmony import */ var _styles_fonts_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../styles/fonts.css */ \"(pages-dir-node)/./styles/fonts.css\");\n/* harmony import */ var _styles_fonts_css__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_styles_fonts_css__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../styles/globals.css */ \"(pages-dir-node)/./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_5__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _components_ErrorBoundary__WEBPACK_IMPORTED_MODULE_3__]);\n([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _components_ErrorBoundary__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\nconst theme = (0,_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.extendTheme)({\n    fonts: {\n        heading: \"'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif\",\n        body: \"'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif\"\n    },\n    colors: {\n        brand: {\n            50: \"#e3f2fd\",\n            100: \"#bbdefb\",\n            200: \"#90caf9\",\n            300: \"#64b5f6\",\n            400: \"#42a5f5\",\n            500: \"#2196f3\",\n            600: \"#1e88e5\",\n            700: \"#1976d2\",\n            800: \"#1565c0\",\n            900: \"#0d47a1\"\n        },\n        grayBg: {\n            900: \"#1a2233\",\n            800: \"#232b38\",\n            700: \"#2d3748\"\n        }\n    },\n    styles: {\n        global: {\n            body: {\n                bg: \"linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)\",\n                color: \"gray.800\",\n                fontFamily: \"'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif\"\n            }\n        }\n    }\n});\nfunction MyApp({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ErrorBoundary__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_head__WEBPACK_IMPORTED_MODULE_2___default()), {\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                        rel: \"preconnect\",\n                        href: \"https://fonts.googleapis.com\"\n                    }, void 0, false, {\n                        fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n                        lineNumber: 48,\n                        columnNumber: 9\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                        rel: \"preconnect\",\n                        href: \"https://fonts.gstatic.com\",\n                        crossOrigin: \"anonymous\"\n                    }, void 0, false, {\n                        fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n                        lineNumber: 49,\n                        columnNumber: 9\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                        href: \"https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap\",\n                        rel: \"stylesheet\"\n                    }, void 0, false, {\n                        fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n                        lineNumber: 50,\n                        columnNumber: 9\n                    }, this)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n                lineNumber: 47,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.ChakraProvider, {\n                theme: theme,\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                    ...pageProps\n                }, void 0, false, {\n                    fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n                    lineNumber: 56,\n                    columnNumber: 9\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n                lineNumber: 55,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/tharanuthiransrettawat/Desktop/raoteebaan/pages/_app.tsx\",\n        lineNumber: 46,\n        columnNumber: 5\n    }, this);\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyApp);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3BhZ2VzL19hcHAudHN4IiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUErRDtBQUVsQztBQUMyQjtBQUMzQjtBQUNFO0FBRy9CLE1BQU1JLFFBQVFILDZEQUFXQSxDQUFDO0lBQ3hCSSxPQUFPO1FBQ0xDLFNBQVM7UUFDVEMsTUFBTTtJQUNSO0lBQ0FDLFFBQVE7UUFDTkMsT0FBTztZQUNMLElBQUk7WUFDSixLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7UUFDUDtRQUNBQyxRQUFRO1lBQ04sS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1FBQ1A7SUFDRjtJQUNBQyxRQUFRO1FBQ05DLFFBQVE7WUFDTkwsTUFBTTtnQkFDSk0sSUFBSTtnQkFDSkMsT0FBTztnQkFDUEMsWUFBWTtZQUNkO1FBQ0Y7SUFDRjtBQUNGO0FBRUEsU0FBU0MsTUFBTSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUMvQyxxQkFDRSw4REFBQ2YsaUVBQWFBOzswQkFDWiw4REFBQ0Qsa0RBQUlBOztrQ0FDSCw4REFBQ2lCO3dCQUFLQyxLQUFJO3dCQUFhQyxNQUFLOzs7Ozs7a0NBQzVCLDhEQUFDRjt3QkFBS0MsS0FBSTt3QkFBYUMsTUFBSzt3QkFBNEJDLGFBQVk7Ozs7OztrQ0FDcEUsOERBQUNIO3dCQUNDRSxNQUFLO3dCQUNMRCxLQUFJOzs7Ozs7Ozs7Ozs7MEJBR1IsOERBQUNwQiw0REFBY0E7Z0JBQUNJLE9BQU9BOzBCQUNyQiw0RUFBQ2E7b0JBQVcsR0FBR0MsU0FBUzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJaEM7QUFFQSxpRUFBZUYsS0FBS0EsRUFBQyIsInNvdXJjZXMiOlsiL1VzZXJzL3RoYXJhbnV0aGlyYW5zcmV0dGF3YXQvRGVza3RvcC9yYW90ZWViYWFuL3BhZ2VzL19hcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENoYWtyYVByb3ZpZGVyLCBleHRlbmRUaGVtZSB9IGZyb20gXCJAY2hha3JhLXVpL3JlYWN0XCI7XG5pbXBvcnQgdHlwZSB7IEFwcFByb3BzIH0gZnJvbSBcIm5leHQvYXBwXCI7XG5pbXBvcnQgSGVhZCBmcm9tIFwibmV4dC9oZWFkXCI7XG5pbXBvcnQgRXJyb3JCb3VuZGFyeSBmcm9tIFwiLi4vY29tcG9uZW50cy9FcnJvckJvdW5kYXJ5XCI7XG5pbXBvcnQgXCIuLi9zdHlsZXMvZm9udHMuY3NzXCI7XG5pbXBvcnQgXCIuLi9zdHlsZXMvZ2xvYmFscy5jc3NcIjtcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gXCJuZXh0L3JvdXRlclwiO1xuXG5jb25zdCB0aGVtZSA9IGV4dGVuZFRoZW1lKHtcbiAgZm9udHM6IHtcbiAgICBoZWFkaW5nOiBcIidLYW5pdCcsICdTYXJhYnVuJywgJ1Byb21wdCcsICdOb3RvIFNhbnMgVGhhaScsICdJbnRlcicsIHNhbnMtc2VyaWZcIixcbiAgICBib2R5OiBcIidLYW5pdCcsICdTYXJhYnVuJywgJ1Byb21wdCcsICdOb3RvIFNhbnMgVGhhaScsICdJbnRlcicsIHNhbnMtc2VyaWZcIixcbiAgfSxcbiAgY29sb3JzOiB7XG4gICAgYnJhbmQ6IHtcbiAgICAgIDUwOiBcIiNlM2YyZmRcIixcbiAgICAgIDEwMDogXCIjYmJkZWZiXCIsXG4gICAgICAyMDA6IFwiIzkwY2FmOVwiLFxuICAgICAgMzAwOiBcIiM2NGI1ZjZcIixcbiAgICAgIDQwMDogXCIjNDJhNWY1XCIsXG4gICAgICA1MDA6IFwiIzIxOTZmM1wiLFxuICAgICAgNjAwOiBcIiMxZTg4ZTVcIixcbiAgICAgIDcwMDogXCIjMTk3NmQyXCIsXG4gICAgICA4MDA6IFwiIzE1NjVjMFwiLFxuICAgICAgOTAwOiBcIiMwZDQ3YTFcIixcbiAgICB9LFxuICAgIGdyYXlCZzoge1xuICAgICAgOTAwOiBcIiMxYTIyMzNcIixcbiAgICAgIDgwMDogXCIjMjMyYjM4XCIsXG4gICAgICA3MDA6IFwiIzJkMzc0OFwiXG4gICAgfVxuICB9LFxuICBzdHlsZXM6IHtcbiAgICBnbG9iYWw6IHtcbiAgICAgIGJvZHk6IHtcbiAgICAgICAgYmc6IFwibGluZWFyLWdyYWRpZW50KDEzNWRlZywgI2UzZjJmZCAwJSwgI2JiZGVmYiAxMDAlKVwiLFxuICAgICAgICBjb2xvcjogXCJncmF5LjgwMFwiLFxuICAgICAgICBmb250RmFtaWx5OiBcIidLYW5pdCcsICdTYXJhYnVuJywgJ1Byb21wdCcsICdOb3RvIFNhbnMgVGhhaScsICdJbnRlcicsIHNhbnMtc2VyaWZcIixcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuXG5mdW5jdGlvbiBNeUFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH06IEFwcFByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPEVycm9yQm91bmRhcnk+XG4gICAgICA8SGVhZD5cbiAgICAgICAgPGxpbmsgcmVsPVwicHJlY29ubmVjdFwiIGhyZWY9XCJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tXCIgLz5cbiAgICAgICAgPGxpbmsgcmVsPVwicHJlY29ubmVjdFwiIGhyZWY9XCJodHRwczovL2ZvbnRzLmdzdGF0aWMuY29tXCIgY3Jvc3NPcmlnaW49XCJhbm9ueW1vdXNcIiAvPlxuICAgICAgICA8bGlua1xuICAgICAgICAgIGhyZWY9XCJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2NzczI/ZmFtaWx5PVNhcmFidW46d2dodEAzMDA7NDAwOzUwMDs2MDA7NzAwJmZhbWlseT1Ob3RvK1NhbnMrVGhhaTp3Z2h0QDMwMDs0MDA7NTAwOzYwMDs3MDAmZGlzcGxheT1zd2FwXCJcbiAgICAgICAgICByZWw9XCJzdHlsZXNoZWV0XCJcbiAgICAgICAgLz5cbiAgICAgIDwvSGVhZD5cbiAgICAgIDxDaGFrcmFQcm92aWRlciB0aGVtZT17dGhlbWV9PlxuICAgICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XG4gICAgICA8L0NoYWtyYVByb3ZpZGVyPlxuICAgIDwvRXJyb3JCb3VuZGFyeT5cbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgTXlBcHA7ICJdLCJuYW1lcyI6WyJDaGFrcmFQcm92aWRlciIsImV4dGVuZFRoZW1lIiwiSGVhZCIsIkVycm9yQm91bmRhcnkiLCJ0aGVtZSIsImZvbnRzIiwiaGVhZGluZyIsImJvZHkiLCJjb2xvcnMiLCJicmFuZCIsImdyYXlCZyIsInN0eWxlcyIsImdsb2JhbCIsImJnIiwiY29sb3IiLCJmb250RmFtaWx5IiwiTXlBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiLCJsaW5rIiwicmVsIiwiaHJlZiIsImNyb3NzT3JpZ2luIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./pages/_app.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./styles/fonts.css":
/*!**************************!*\
  !*** ./styles/fonts.css ***!
  \**************************/
/***/ (() => {



/***/ }),

/***/ "(pages-dir-node)/./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "(pages-dir-node)/__barrel_optimize__?names=FaExclamationTriangle!=!./node_modules/react-icons/fa/index.mjs":
/*!*************************************************************************************************!*\
  !*** __barrel_optimize__?names=FaExclamationTriangle!=!./node_modules/react-icons/fa/index.mjs ***!
  \*************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Users_tharanuthiransrettawat_Desktop_raoteebaan_node_modules_react_icons_fa_index_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/react-icons/fa/index.mjs */ "(pages-dir-node)/./node_modules/react-icons/fa/index.mjs");
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in _Users_tharanuthiransrettawat_Desktop_raoteebaan_node_modules_react_icons_fa_index_mjs__WEBPACK_IMPORTED_MODULE_0__) if(__WEBPACK_IMPORT_KEY__ !== "default") __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => _Users_tharanuthiransrettawat_Desktop_raoteebaan_node_modules_react_icons_fa_index_mjs__WEBPACK_IMPORTED_MODULE_0__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);


/***/ }),

/***/ "@chakra-ui/react":
/*!***********************************!*\
  !*** external "@chakra-ui/react" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = import("@chakra-ui/react");;

/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc","vendor-chunks/react-icons"], () => (__webpack_exec__("(pages-dir-node)/./pages/_app.tsx")));
module.exports = __webpack_exports__;

})();