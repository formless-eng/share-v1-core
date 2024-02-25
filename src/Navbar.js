import React, { useState } from 'react';
import './Navbar.css';

const Navbar = ({ isScrolled }) => {
	const options = [
		{ logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Polygon_Blockchain_Matic_Logo.svg' },
		{ logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg' },
		{ logo: 'https://optimistic.etherscan.io/images/svg/brands/main.svg' },
	];
	const [selectedOption, setSelectedOption] = useState(options[0]);
	const [isOpen, setIsOpen] = useState(false);

	const toggleDropdown = () => setIsOpen(!isOpen);

	const handleSelect = option => {
		setSelectedOption(option);
		setIsOpen(false);
		window.location.href = '/';
	};

	return (
		<nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
			<div className="nav-logo">
				<img src="https://app.share.formless.xyz/formless-mark-white.svg" alt="Formless Mark White" />
			</div>
			<div className="nav-items">
				<h2><a href="https://formless.xyz" className="nav-item" target="_blank" rel="noopener noreferrer">TOP CONTRACTS : SHARE PROTOCOL'S MOST PLAYED SONGS</a></h2>
			</div>
			<div className="nav-dropdown">
				<div className="custom-dropdown" onClick={toggleDropdown}>
					<div className="dropdown-selected">
						<img src={selectedOption.logo} alt="/" />
					</div>
					<div className={`dropdown-options ${isOpen ? 'show' : ''}`}>
						{options.map((option, index) => (
							<div className="dropdown-option" key={index} onClick={() => handleSelect(option)}>
								<img src={option.logo} alt="" />
								<span>{option.text}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
