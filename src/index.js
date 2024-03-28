import React, { useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Convert from 'xml-js';
import DOMPurify from 'dompurify';
import { AgGridReact } from 'ag-grid-react';

import './index.scss';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

function BigWigAutocomplete() {
	const [rowData, setRowData] = useState([]);
	const [options, setOptions] = useState([]);
	const [isLoading, setLoading] = useState(false);
	const [status, setStatus] = useState('');
	const [orgName, setOrgName] = useState('');
	const [orgMetadata, setOrgMetadata] = useState('');
	const [orgCategory, setOrgCategory] = useState('');
	const [proPublicaLink, setProPublicaLink] = useState('https://projects.propublica.org/nonprofits/');
	const [inputValue, setInputValue] = useState('');
	const [loadIndicator, setLoadIndicator] = useState('');
	const [disambiguateList, setDisambiguateList] = useState('');

	const MESSAGES = {
		error: 'There was a problem retrieving data from ProPublica.',
		missing: 'It looks like ProPublica is missing IRS data for this org.'
	};

	const [shareObj] = useState({
		title: 'BigWig990',
		text: '',
		url: window.location.href
	});

	const gridRef = useRef();
	const previousController = useRef();

	const containerClasses = [];
	const ENDPOINT = 'https://antifascistscience.club/grotter/bigwig990/';

	let _i = 0;
	let _numFiles = 0;
	let _bigwigs = {};

	const currencyFormatter = (params) => {
		return '$' + Math.floor(params.value).toLocaleString();
	};

	const onError = (e) => {
		if (typeof (e) == 'object') {
			if (e.code && e.code === 20) {
				// user abort
				return;
			}
		}

		setStatus(MESSAGES.error);
	}

	const onDataComplete = () => {
		let d = [];

		for (var i in _bigwigs) {
			let year = _bigwigs[i];
			let j = year.length;

			while (j--) {
				let person = year[j];

				d.push({
					year: parseInt(i),
					name: person.name,
					title: person.title,
					totalComp: person.comp + person.compOther
				});
			}
		}

		setRowData(d);
		setLoading(false);
		
		if (d.length === 0) setStatus(MESSAGES.missing);

		window.dispatchEvent(new Event('resize'));
	};

	const processData = (data) => {
		// year
		var header = data.Return.ReturnHeader;
		var year = '1000';

		if (header.hasOwnProperty('TaxYr')) {
			year = header.TaxYr._text;
		}

		if (header.hasOwnProperty('TaxYear')) {
			year = header.TaxYear._text;
		}

		if (!_bigwigs[year]) _bigwigs[year] = [];

		// bigwigs
		var bigwigs = {};
		var obj = {};

		if (!data.Return.ReturnData.hasOwnProperty('IRS990')) {
			if (data.Return.ReturnData.hasOwnProperty('IRS990EZ')) {
				obj = data.Return.ReturnData.IRS990EZ;

				if (obj.hasOwnProperty('OfficerDirectorTrusteeEmplGrp')) {
					if (!Array.isArray(obj.OfficerDirectorTrusteeEmplGrp)) {
						obj.OfficerDirectorTrusteeEmplGrp = [obj.OfficerDirectorTrusteeEmplGrp];
					}

					var j = obj.OfficerDirectorTrusteeEmplGrp.length;

					while (j--) {
						var person = obj.OfficerDirectorTrusteeEmplGrp[j];

						if (person.hasOwnProperty('CompensationAmt')) {
							let name = '';
							if (person.hasOwnProperty('PersonNm')) name = person.PersonNm._text;
							if (person.hasOwnProperty('BusinessName')) name = person.BusinessName.BusinessNameLine1Txt?._text;

							_bigwigs[year].push({
								name: name,
								title: person.TitleTxt._text,
								comp: parseInt(person.CompensationAmt._text),
								compOther: 0
							});
						}
					}
				}
			}

			return;
		}

		obj = data.Return.ReturnData.IRS990;
		if (obj.hasOwnProperty('Form990PartVIISectionAGrp')) bigwigs = obj.Form990PartVIISectionAGrp;
		if (obj.hasOwnProperty('Form990PartVIISectionA')) bigwigs = obj.Form990PartVIISectionA;

		if (!Array.isArray(bigwigs)) bigwigs = [bigwigs];

		for (var i in bigwigs) {
			let bw = bigwigs[i];
			let bigwigObj = { name: '', title: '-', comp: 0, compOther: 0 };
			let total = 0;

			if (bw.hasOwnProperty('ReportableCompFromOrgAmt')) {
				total = parseInt(bw.ReportableCompFromOrgAmt._text);
				if (bw.hasOwnProperty('ReportableCompFromRltdOrgAmt')) total += parseInt(bw.ReportableCompFromRltdOrgAmt._text);
				if (bw.hasOwnProperty('OtherCompensationAmt')) total += parseInt(bw.OtherCompensationAmt._text);

				bigwigObj.comp = parseInt(bw.ReportableCompFromOrgAmt._text);
				bigwigObj.compOther = total - parseInt(bw.ReportableCompFromOrgAmt._text);
			}

			if (bw.hasOwnProperty('ReportableCompFromOrganization')) {
				total = parseInt(bw.ReportableCompFromOrganization._text);
				if (bw.hasOwnProperty('ReportableCompFromRelatedOrgs')) total += parseInt(bw.ReportableCompFromRelatedOrgs._text);
				if (bw.hasOwnProperty('OtherCompensation')) total += parseInt(bw.OtherCompensation._text);

				bigwigObj.comp = parseInt(bw.ReportableCompFromOrganization._text);
				bigwigObj.compOther = total - parseInt(bw.ReportableCompFromOrganization._text);
			}

			if (!bw.hasOwnProperty('PersonNm') && !bw.hasOwnProperty('NamePerson')) {
				if (bw.hasOwnProperty('BusinessName')) {
					bigwigObj.name = bw.BusinessName.BusinessNameLine1Txt?._text;
				}
			}

			if (bw.hasOwnProperty('PersonNm')) bigwigObj.name = bw.PersonNm._text;
			if (bw.hasOwnProperty('NamePerson')) bigwigObj.name = bw.NamePerson._text;
			if (bw.hasOwnProperty('Title')) bigwigObj.title = bw.Title._text;
			if (bw.hasOwnProperty('TitleTxt')) bigwigObj.title = bw.TitleTxt._text;

			// debug
			evaluateCalc(bigwigObj, bw);

			_bigwigs[year].push(bigwigObj);
		}
	}

	const evaluateCalc = (calcObj, obj) => {
		const hoursFields = [
			'AverageHoursPerWeekRt',
			'AverageHoursPerWeekRelated',
			'AverageHoursPerWeek',
			'AverageHoursPerWeekRltdOrgRt'
		];

		let tote = 0;

		for (var k in obj) {
			if (hoursFields.indexOf(k) === -1) {
				let t = parseInt(obj[k]._text);
				if (!isNaN(t)) tote += t;
			}
		}

		if (tote !== calcObj.comp + calcObj.compOther) {
			console.log(obj);
			console.log(calcObj.comp + calcObj.compOther);
			console.log(tote);
		}
	}

	const onXML = (xml) => {
		// convert XML to JSON
		let json = Convert.xml2json(xml.trim(), { compact: true });
		json = JSON.parse(json);

		processData(json);

		_i++;
		
		setLoadIndicator(Math.round((_i / _numFiles) * 100) + '%');

		if (_i === _numFiles) onDataComplete();
	};

	const onXMLPaths = (json) => {
		setRowData([]);
		setOrgName(json.header);
		setOrgMetadata(json.subheader);
		setOrgCategory(json.category);

		if (!Array.isArray(json.xml) || json.xml.length === 0) {
			setLoading(false);
			setStatus(MESSAGES.missing);
			return;
		}

		let i = json.xml.length;
		_i = 0;
		_numFiles = i;

		while (i--) {
			getData({ type: 'xml', path: json.xml[i] }, onXML, false);
		}
	};

	const onSearch = (json) => {
		if (!json.organizations) return;
		// console.log(json);

		let newOptions = [];
		let i = json.organizations.length;

		while (i--) {
			let org = json.organizations[i];

			newOptions.push({
				title: org.name,
				value: org.ein,
				data: org
			});
		}

		setOptions(newOptions);
	};

	const getData = (params, onData, isAbort = true) => {
		if (isAbort && previousController.current) {
			previousController.current.abort();
		}

		const controller = new AbortController();
		previousController.current = controller;

		let url = ENDPOINT;
		const myParams = new URLSearchParams(params);
		url += '?' + myParams.toString();

		fetch(url, {
			signal: controller.signal
		})
			.then(function (response) {
				if (params.type === 'xml') {
					return response.text();
				} else {
					return response.json();
				}
			})
			.then(onData)
			.catch(onError);
	};

	// update autocomplete
	const onInputChange = (event, value, reason) => {
		if (event && event.type === 'blur') {
			setInputValue('');
		} else if (reason !== 'reset') {
			setInputValue(value);

			if (value) {
				getData({ type: 'search', q: value }, onSearch);
			} else {
				setOptions([]);
			}
		}
	};

	const refineSearch = (obj) => {
		let ul = '<ul>';

		options.forEach(function (option) {
			if (option.title === obj.title) {
				ul += '<li>';
				ul += '<a href="#' + option.value + '">' + option.title + '</a>';
				ul += '<ul>';
				ul += '<li>EIN: ' + option.data.ein + '</li>';
				ul += '<li>' + option.data.city + ', ' + option.data.state + '</li>';
				ul += '</ul>';
				ul += '</li>';
			}
		});

		ul += '</ul>';

		window.location.hash = '';
		setRowData([]);
		setDisambiguateList('<h2>Disambiguate:</h2>' + ul);
	}

	const start = (ein) => {
		setInputValue('');

		setProPublicaLink('https://projects.propublica.org/nonprofits/organizations/' + ein);
		setLoading(true);

		window.location.hash = ein;
		setLoadIndicator('');
		getData({ type: 'xmlPathsByEin', ein: ein }, onXMLPaths);
	}

	// submit
	const onChange = (event, obj, reason) => {
		_bigwigs = {};
		
		setStatus('');
		setOrgName('');
		setOrgCategory('');
		setOrgMetadata('');
		setDisambiguateList('');

		if (obj) {
			const isMultiple = (el) => el.title === obj.title && el.value !== obj.value;

			if (options.some(isMultiple)) {
				// selected title has multiple options
				refineSearch(obj);
				return;
			}

			start(obj.value);
		}
	};

	const isShareEnabled = (data) => {
		if (typeof (navigator.canShare) == 'function') {
			return navigator.canShare(data);
		}

		return false;
	}

	const onShare = useCallback(() => {
		shareObj.url = window.location.href;
		shareObj.text = 'Nonprofit compensation data from the IRS / ' + orgName;

		if (!isShareEnabled(shareObj)) return;

		navigator.share(shareObj).then(function () {
			// shared
		}).catch(function (err) {
			// user cancel
			if (err.name && err.name === 'AbortError') return;

			// @see https://www.w3.org/TR/web-share/
			console.log('Your browser’s Web Share API implementation is buggy.');
		});

		return false;
	}, [shareObj, orgName]);

	const onExport = useCallback(() => {
		let name = orgName.replace(/[\W_]+/g, '-') + '.csv';
		if (orgName === '') name = 'empty';

		gridRef.current.api.exportDataAsCsv({
			fileName: name
		});

		return false;
	}, [orgName]);

	React.useEffect(() => {

		if (!isShareEnabled(shareObj)) {
			console.log('Enable the native Web Share APIs chrome://flags/#web-share');
		}

		// resize grid to fit browser
		window.addEventListener('resize', () => {
			gridRef.current?.api.sizeColumnsToFit({
				columnLimits: [
					{
						key: 'year',
						maxWidth: 120
					},
					{
						key: 'name',
						maxWidth: 250
					},
					{
						key: 'totalComp',
						maxWidth: 200
					}
				]
			});
		});

		// deep link
		window.addEventListener('hashchange', (e) => {
			const ein = parseInt(window.location.hash.substring(1));
			if (!isNaN(ein)) onChange(null, { value: ein });
		});

		window.dispatchEvent(new Event('hashchange'));

		// eslint-disable-next-line
	}, []);

	containerClasses.push(isLoading ? 'loading' : null);

	if (isShareEnabled(shareObj)) {
		containerClasses.push('share-enabled');
	}

	return (
		<div className={containerClasses.join(' ')}>

			<header className={'ag-theme-material'}>

				<Autocomplete
					disableClearable
					filterOptions={(x) => x}
					blurOnSelect={true}
					options={options}
					onChange={onChange}
					inputValue={inputValue}
					onInputChange={onInputChange}
					getOptionKey={(option) => option.value}
					getOptionLabel={(option) => option.title}
					isOptionEqualToValue={(option, value) => true}
					renderInput={(params) => (
						<TextField
							{...params}
							placeholder='Search for a nonprofit'
							InputProps={{
								...params.InputProps
							}}
						/>
					)}
				/>

				<ul className="nav">
					<li>
						<a target="_blank" rel="noreferrer" href={proPublicaLink}>View on ProPublica</a>
					</li>
					<li>
						<button onClick={onExport}>Export</button>
					</li>
					<li className="share">
						<button onClick={onShare}>Share</button>
					</li>
					<li>
						<a href="https://github.com/grotter/BigWig990">About</a>
					</li>
				</ul>

				<h1>{orgName}</h1>
				<div className="org-category" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(orgCategory) }}></div>
				<div className="org-metadata" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(orgMetadata) }}></div>

			</header>

			<div
				className="ag-theme-material ag-container"
			>
				<div className="ui" id="status-msg">{status}</div>
				<div className="ui" id="loading">Loading {loadIndicator}</div>
				<div className="ui" id="disambiguate" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(disambiguateList) }}></div>

				<AgGridReact
					ref={gridRef}
					suppressLoadingOverlay={true}
					suppressNoRowsOverlay={true}
					rowData={rowData}
					autoSizeStrategy={
						{
							type: 'fitGridWidth',
							defaultMinWidth: 100,
							columnLimits: [
								{
									colId: 'year',
									maxWidth: 120
								},
								{
									colId: 'name',
									maxWidth: 250
								},
								{
									colId: 'totalComp',
									maxWidth: 200
								}
							]
						}
					}
					columnDefs={
						[
							{ field: 'year' },
							{ field: 'name' },
							{ field: 'title' },
							{
								field: 'totalComp',
								headerName: 'Compensation',
								sort: 'desc',
								valueFormatter: currencyFormatter
							},
						]
					}
				/>
			</div>

		</div>
	);
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
	<React.StrictMode>
		<BigWigAutocomplete />
	</React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
