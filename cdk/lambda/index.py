import json
import requests
from bs4 import BeautifulSoup
import re

def lambda_handler(event, context):
    
    # TODO:クエリからパーク情報を取得
    park = event.get('queryStringParameters').get('park')
    url = f"https://tokyodisneyresort.info/realtime.php?park={park}"
    response = requests.get(url)
    
    soup = BeautifulSoup(response.text, "html.parser")
    pattern = re.compile(r'attrWait\.php\?attr_id=\d{3,}&park=.+')
    
    attractions = []
    
    # アトラクション名と待ち時間を一緒のループで取得する
    for attr_element in  soup.find_all('a',href=pattern):
      attr_name_raw = attr_element.find(class_="realtime-attr-name")
      attr_name = attr_name_raw.text
    
      attr_condition_raw = attr_element.find(class_="realtime-attr-condition")
      # attr_condition_raw.textで取得すると、子要素のdivタグの文字列も入り込んでしまうため
      attr_condition = attr_condition_raw.contents[0].strip()
    
      attractions.append({'name': attr_name,'condition': attr_condition})
    
    print(attractions)


    return {
        'statusCode': 200,
        'body': json.dumps(attractions,ensure_ascii=False)
    }
