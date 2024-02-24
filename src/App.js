import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

import './App.css';

const ItemsPerPage = 10;

function App() {
	const [data, setData] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		fetch('/api.json')
			.then(response => response.json())
			.then(data => {
				setData(data);
				setIsLoading(false);
			})
			.catch(error => console.error("Failed to load data:", error));
	}, []);

	useEffect(() => {
		const loadMoreItems = () => {
			if (window.innerHeight + document.documentElement.scrollTop === document.documentElement.offsetHeight) {
				if (currentPage * ItemsPerPage < data.length) {
					setCurrentPage(currentPage => currentPage + 1);
				}
			}
		};

		window.addEventListener('scroll', loadMoreItems);

		return () => window.removeEventListener('scroll', loadMoreItems);
	}, [currentPage, data.length]);

	const currentData = data.slice(0, currentPage * ItemsPerPage);

	if (isLoading) {
		return <div className="loading">Loading...</div>;
	}

	return (
		<div className="App">
			<Navbar />

			<ChartList items={currentData} />
			<Footer />
		</div>
	);
}

function ChartList({ items }) {
	return (
		<div className="chartList">
			{items.map(([address, details], index) => (
				<div key={index} className="chartItem">
					<div className="chartPosition">{index + 1}</div>
					<div className="chartDetails">
						<div className="chartTitle">{details.metaName}</div>
						<div className="transactionCount">Total Plays: {details.count}</div>
						<a href={details.url} target="_blank" rel="noopener noreferrer" className="listenNowLink">
							<div className="contentWrapper">
								<span>Listen now on </span>
								<img src="https://app.share.formless.xyz/formless-mark-black.svg" alt="Formless Logo" style={{ width: '50px', height: '50px' }} />
							</div>
						</a>
					</div>
				</div>
			))}
		</div>

	);
}

export default App;
