<?php
	
	class ProPublica {
		private $_domain = 'https://projects.propublica.org';

		public function __construct () {
			//
		}

		private function _getData ($url) {
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
			$result = curl_exec($ch);
	
			if ($result === false) {
				trigger_error(curl_error($ch));
				curl_close($ch);
				return false;
			}
			
			curl_close($ch);
			return $result;
		}

		public function getSearchResults ($query) {
			return $this->_getData($this->_domain . '/nonprofits/api/v2/search.json?q=' . urlencode($query));	
		}

		public function getXMLPaths ($ein) {
			$html = $this->_getData($this->_domain . '/nonprofits/organizations/' . $ein);
			
			$dom = new DomDocument();
			
			libxml_use_internal_errors(true);
			$dom->loadHTML($html);
			libxml_clear_errors();

			$q = new DomXPath($dom);

			$xmlPaths = array();
			$btns = $q->query('//section[contains(@class,"single-filing-period")]//div[contains(@class,"btns")]//a[contains(@class,"btn")]');
			
			if (get_class($btns) == 'DOMNodeList') {
				foreach ($btns as $btn) {
					if ($btn->nodeValue == 'XML') {
						$href = $btn->getAttribute('href');
	
						if ($href) {
							$xmlPaths[] = $href;
						}
					}
				}
			}

			return json_encode(array(
				'xml' => $xmlPaths,
				'header' => $this->_getHtmlFromSelector($q, '//h1[contains(@class,"text-hed-900")]', true),
				'subheader' => $this->_getHtmlFromSelector($q, '//ul[contains(@class,"basic-org-metadata")]'),
				'category' => $this->_getHtmlFromSelector($q, '//p[contains(@class,"ntee-category")]')
			));
		}

		private function _getHtmlFromSelector ($q, $selector, $raw = false) {
			$html = '';
			$el = $q->query($selector);

			if (get_class($el) == 'DOMNodeList' && $el->length == 1) {
				if ($raw) {
					$html = $el[0]->nodeValue;
				} else {
					$html = $el[0]->ownerDocument->saveXML($el[0]);
				}
			}

			return $html;
		}

		public function getXML ($path) {
			return file_get_contents($this->_domain . $path);
		}
	}

?>
