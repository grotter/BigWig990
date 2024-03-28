<?php
	
	header('Access-Control-Allow-Origin: *');

	require('ProPublica.php');
	$foo = new ProPublica();

	switch ($_REQUEST['type']) {
		case 'search':
			header('Content-Type: application/json; charset=utf-8');
			echo $foo->getSearchResults($_REQUEST['q']);
			break;
		case 'xmlPathsByEin':
			header('Content-Type: application/json; charset=utf-8');
			echo $foo->getXMLPaths($_REQUEST['ein']);
			break;
		case 'xml':
			header('Content-type: text/xml');
			echo $foo->getXML($_REQUEST['path']);
			break;
	}

?>
