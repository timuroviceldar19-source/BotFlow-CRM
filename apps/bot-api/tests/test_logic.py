import pytest
from app.services.user_service import parse_start_payload, build_partner_click_url
from app.models import EventType

def test_parse_start_payload_basic():
    payload = "src-google__utm_source-ads__utm_campaign-spring"
    result = parse_start_payload(payload)
    assert result["source"] == "google"
    assert result["utm_source"] == "ads"
    assert result["utm_campaign"] == "spring"

def test_parse_start_payload_with_partner():
    payload = "src-telegram__partner-saas-platform"
    result = parse_start_payload(payload)
    assert result["source"] == "telegram"
    assert result["partner_slug"] == "saas-platform"

def test_parse_start_payload_empty():
    result = parse_start_payload("")
    assert result["source"] == "telegram"
    assert result["utm_source"] is None

def test_build_partner_click_url():
    base_url = "https://partner.com/reg"
    tracking_code = "xyz123"
    param = "click_id"
    telegram_user_id = 123
    
    url = build_partner_click_url(base_url, param, tracking_code, telegram_user_id)
    assert "click_id=xyz123" in url
    assert "telegram_id=123" in url
    assert url.startswith(base_url)

def test_build_partner_click_url_existing_params():
    base_url = "https://partner.com/reg?promo=FREE"
    tracking_code = "xyz123"
    param = "subid"
    telegram_user_id = 123
    
    url = build_partner_click_url(base_url, param, tracking_code, telegram_user_id)
    assert "promo=FREE" in url
    assert "subid=xyz123" in url
    assert "telegram_id=123" in url
