package pool

import (
	"context"
	"errors"
	"sync"
)

var ErrPoolClosed = errors.New("worker pool is closed")

type Job struct {
	Task func(ctx context.Context) (interface{}, error)
	Res  chan Result
}

type Result struct {
	Val interface{}
	Err error
}

type WorkerPool struct {
	workers   int
	queue     chan Job
	wg        sync.WaitGroup
	ctx       context.Context
	cancel    context.CancelFunc
	closeOnce sync.Once
}

func NewWorkerPool(workers, queueCapacity int) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	wp := &WorkerPool{
		workers: workers,
		queue:   make(chan Job, queueCapacity),
		ctx:     ctx,
		cancel:  cancel,
	}

	wp.start()
	return wp
}

func (wp *WorkerPool) start() {
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker()
	}
}

func (wp *WorkerPool) worker() {
	defer wp.wg.Done()
	for {
		select {
		case <-wp.ctx.Done():
			return
		case job, ok := <-wp.queue:
			if !ok {
				return
			}
			val, err := job.Task(wp.ctx)
			job.Res <- Result{Val: val, Err: err}
		}
	}
}

func (wp *WorkerPool) Submit(ctx context.Context, task func(ctx context.Context) (interface{}, error)) (interface{}, error) {
	resCh := make(chan Result, 1)
	job := Job{
		Task: task,
		Res:  resCh,
	}

	select {
	case <-wp.ctx.Done():
		return nil, ErrPoolClosed
	case <-ctx.Done():
		return nil, ctx.Err()
	case wp.queue <- job:
	}

	select {
	case <-wp.ctx.Done():
		return nil, ErrPoolClosed
	case <-ctx.Done():
		return nil, ctx.Err()
	case res := <-resCh:
		return res.Val, res.Err
	}
}

func (wp *WorkerPool) Shutdown() {
	wp.closeOnce.Do(func() {
		wp.cancel()
		close(wp.queue)
		wp.wg.Wait()
	})
}
