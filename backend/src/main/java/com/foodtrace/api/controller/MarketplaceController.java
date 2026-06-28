package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.MarketplaceService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {
  private final MarketplaceService marketplaceService;

  public MarketplaceController(MarketplaceService marketplaceService) {
    this.marketplaceService = marketplaceService;
  }

  @GetMapping("/posts")
  public Map<String, Object> feed(
      @RequestParam(required = false) String domain,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "25") int limit,
      Authentication authentication) {
    return marketplaceService.feed(currentUser(authentication), domain, q, limit);
  }

  @PostMapping("/posts")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createPost(@RequestBody Map<String, Object> body, Authentication authentication) {
    return marketplaceService.createPost(currentUser(authentication), body);
  }

  @PostMapping("/posts/{postId}/like")
  public Map<String, Object> toggleLike(@PathVariable String postId, Authentication authentication) {
    return marketplaceService.toggleLike(currentUser(authentication), postId);
  }

  @PostMapping("/posts/{postId}/save")
  public Map<String, Object> toggleSave(@PathVariable String postId, Authentication authentication) {
    return marketplaceService.toggleSave(currentUser(authentication), postId);
  }

  @GetMapping("/posts/{postId}/comments")
  public Map<String, Object> comments(@PathVariable String postId) {
    return marketplaceService.comments(postId);
  }

  @PostMapping("/posts/{postId}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> addComment(
      @PathVariable String postId,
      @RequestBody Map<String, Object> body,
      Authentication authentication) {
    return marketplaceService.addComment(currentUser(authentication), postId, body);
  }

  @PatchMapping("/posts/{postId}/flag")
  public Map<String, Object> flagPost(
      @PathVariable String postId,
      @RequestBody Map<String, Object> body,
      Authentication authentication) {
    return marketplaceService.flagPost(currentUser(authentication), postId, body);
  }

  @PatchMapping("/posts/{postId}/recall")
  public Map<String, Object> recallPost(
      @PathVariable String postId,
      @RequestBody Map<String, Object> body,
      Authentication authentication) {
    return marketplaceService.recallPost(currentUser(authentication), postId, body);
  }

  private CurrentUser currentUser(Authentication authentication) {
    return (CurrentUser) authentication.getPrincipal();
  }
}
