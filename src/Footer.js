import React, { useState, useEffect } from 'react';
import './Footer.css';

const Footer = () => {
	const [topArtists, setTopArtists] = useState([]);

	useEffect(() => {
		fetch('/api.json')
			.then(response => response.json())
			.then(data => {
				const artistNames = data.slice(0, 10).map(item => item[1].metaName);
				setTopArtists(artistNames);
			})
			.catch(error => console.error("Failed to load data:", error));
	}, []);

	return (
		<footer className="footer">
			<div className="ticker-container">
				<div className="ticker-content">
					{topArtists.map((name, index) => (
						<React.Fragment key={index}>
							<span>{name}</span>
							{index < topArtists.length - 1 && (
								<img src="https://app.share.formless.xyz/formless-mark-white.svg" alt="Formless Mark White" className="ticker-icon" />
							)}
						</React.Fragment>
					))}
				</div>
			</div>
		</footer>
	);
};

export default Footer;
